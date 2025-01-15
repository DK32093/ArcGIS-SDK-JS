require(["esri/Map", 
         "esri/views/MapView", 
         "esri/layers/ImageryLayer",
         "esri/layers/FeatureLayer",
         "esri/symbols/SimpleFillSymbol",
         "esri/rest/support/Query",
         "esri/rest/support/ImageHistogramParameters",
         "esri/widgets/Histogram",
         "esri/widgets/Expand",
         "esri/widgets/ScaleBar",
         "esri/layers/support/RasterFunction",
         "esri/geometry/geometryEngine"], 
  (Map, 
   MapView, 
   ImageryLayer, 
   FeatureLayer, 
   SimpleFillSymbol, 
   Query, 
   ImageHistogramParameters,
   Histogram,
   Expand,
   ScaleBar,
   RasterFunction,
   geometryEngine) => { 
    const map = new Map({
      basemap: "streets-vector"
    });

    const view = new MapView({
      container: "viewDiv",
      map: map,
      center: [-70.98499306059419, 42.156377043463085],
      zoom: 8,
      constraints: {
        minZoom: 8
      }
    });

    // Add scale bar
    const scaleBarContainer = document.getElementById("scaleBarContainer")
    const scaleBar = new ScaleBar({
      view: view,
      container: scaleBarContainer
    });
    
    // Mobile settings
    let mobile = "f"
    if (window.innerWidth < 500) {
      mobile = "t"
      scaleBarContainer.style.right = "30%"
      scaleBarContainer.style.transform = "translate(-30%, 0%)"
      // Change flex display 
      const aboutMe = document.getElementById("aboutMe");
      aboutMe.style.display = "block"
      // Update welcome card layout
      const welcomeContainer = document.getElementById("welcomeContainer");
      welcomeContainer.style.minWidth = "0"
      welcomeContainer.style.minHeight = "0"
      welcomeContainer.style.width = "90vw"
      welcomeContainer.style.height = "80vh"
      welcomeContainer.style.transform = "translate(-25%, 0%)"
      // Change intro text
      const intro = document.getElementById("intro")
      intro.innerText = "This application shows the percentage of different land cover classes within subwatersheds around Boston, MA in 2023. Simply tap on a watershed to get a summary! Close this window to get started."
      // Add close button
      const mobileCloseButton = document.createElement("button");
      mobileCloseButton.innerText = "X"
      mobileCloseButton.id = "mobileCloseButton"
      mobileCloseButton.classList.add("close")
      welcomeContainer.append(mobileCloseButton)
    }

    // Get land cover data
    const Sentinel2 = new ImageryLayer({
      url: "https://ic.imagery1.arcgis.com/arcgis/rest/services/Sentinel2_10m_LandCover/ImageServer"
    });
    
    // Set land cover time extent to 2023
    const timeExtent = {
      start: new Date(Date.UTC(2023, 0, 1)),
      end: new Date(Date.UTC(2023, 11, 31))
    };
    view.timeExtent = timeExtent;

    // Get HUC 4 watersheds
    const WBD_HUC4 = new FeatureLayer({
      url: "https://services.arcgis.com/P3ePLMYs2RVChkJx/arcgis/rest/services/Watershed_Boundary_Dataset_HUC_4s/FeatureServer?f=pjson"
    });

    // Get HUC 12 watersheds
    const WBD_HUC12 = new FeatureLayer({
      url: "https://services.arcgis.com/P3ePLMYs2RVChkJx/arcgis/rest/services/Watershed_Boundary_Dataset_HUC_12s/FeatureServer",
      simplify: true
    });

     // Create custom legend
     const SentinelColors = [
      'rgb(26, 91, 171)',
      'rgb(53, 130, 33)',
      'rgb(135, 209, 158)',
      'rgb(255, 219, 92)',
      'rgb(237, 2, 42)',
      'rgb(237, 233, 228)',
      'rgb(200, 200, 200)',
      'rgb(242, 250, 255)',
      'rgb(239, 207, 168)'
    ]

    const SentinelLabels = [
      "Water", 
      "Trees", 
      "Flooded Veg.", 
      "Crops", 
      "Built Area", 
      "Bare Ground", 
      "Snow/Ice", 
      "Clouds", 
      "Rangeland"
    ]

     const sentinel2Leg = document.getElementById("sentinel2Leg")
     SentinelLabels.forEach((name, index) => {
       const legPair = document.createElement("div")
       legPair.classList.add("legPair"); 
       const legColor = document.createElement("div")
       legColor.classList.add("legColor"); 
       const legLabel = document.createElement("div")
       legLabel.classList.add("legLabel"); 
       legColor.style.backgroundColor = SentinelColors[index]
       legLabel.innerText = name
       legPair.appendChild(legColor)
       legPair.appendChild(legLabel)
       sentinel2Leg.appendChild(legPair)
     });
 
     const customLegend = document.getElementById("customLegend")
     const expand = new Expand({
       view: view,
       content: customLegend,
       expandIconClass: "esri-icon-description",
       expanded: true
     });
 
     view.ui.add(expand, "top-right")

    // Default HUC border style
    const polygonSymbol = new SimpleFillSymbol({
      color: [0, 0, 0, 0],
      outline: {
        color: [0, 0, 0],
        width: 2
      }
    });

    // Highlight style
    const highlightSymbol = new SimpleFillSymbol({
      color: [0, 0, 255, 0.5],
      outline: {
        color: [0, 0, 0],
        width: 2
      }
    });

    // Current chart area
    const chartHighlight = new SimpleFillSymbol({
      color: [255, 255, 0, 0.5],
      outline: {
        color: [0, 0, 0],
        width: 2
      }
    });

    // Function to check watershed size to prevent request-size-limit errors 
    function filterWatersheds(featureset) {
      for (feature of featureset) {
        const length = feature.attributes.Shape__Length
        const area = feature.attributes.Shape__Area
        if (length > 130000 || area > 320000000) {
          const id = feature.attributes.HUC12
          const index = featureset.findIndex(feature => {
            return feature.attributes.HUC12 === id;
          });
          featureset.splice(index, 1);
        }
      }
      return featureset
    }

    // The callback function to add the filtered watersheds to the map
    function createMapGraphics(featureset) {
      const watersheds = featureset.map((feature) => {
        return {
          geometry: feature.geometry,
          symbol: polygonSymbol,
          id: feature.attributes.HUC12,
          name: feature.attributes.NAME,
          area: feature.attributes.Shape__Area
        }
      })
      view.graphics.addMany(watersheds);
      console.log(view.graphics.length)
    }

    // Function to wait for featureset to load before area/length filter
    let i  = 0
    function waitForCollectionLength(collection, targetLength, callback) {
      const checkInterval = setInterval(() => {
        console.log("check")
        i += 1
        if (i === 25) {
          alert("Sorry, the data was slow to load. Please refresh the page :)")
        }
        const filteredWatersheds = callback(collection)
        if (filteredWatersheds.length !== targetLength) {
          return
        } else {
          createMapGraphics(filteredWatersheds)
          clearInterval(checkInterval);
        }
      }, 300) // Check every 300 milliseconds until cleared
    }

    // Function for clearing chart
    function destroyChart(chartStatus) {
      chartStatus.destroy();
      const previousDiv = document.getElementById("histogramDiv");
      const previousChart = document.getElementById("chartDiv");
      previousDiv.remove()
      previousChart.remove()
    }

    // Function for removing empty classes from charts
    function filterHist(array, ranges) {
      return array.filter((_, index) => {
        return ranges.some(([start, end]) => index >= start && index <= end);
      });
    }

    // Info button: Remove or add welcome div on click
    const infoButton = document.getElementById("infoButton");
    infoButton.classList.add("close")
    const triangle = document.getElementById("triangle")
    const welcomeContainer = document.getElementById("welcomeContainer");
    const closeButtons = document.querySelectorAll(".close")
    closeButtons.forEach(button => {
      button.addEventListener("click", () => {
        if (welcomeContainer.style.display === "none") {
          welcomeContainer.style.display = "unset"
          triangle.style.display = "unset"
        } else {
          welcomeContainer.style.display = "none"
          triangle.style.display = "none"
        }
      });
    })

    // Highlight on hover logic
    let previousID;
    let previousGraphic;
    view.graphics.watch("length", () => {
      if (window.innerWidth > 500) { // not on mobile
        view.on("pointer-move", (event) => {
          view.hitTest(event).then((hitTestResult) => {
            if (hitTestResult.results.length > 0 && hitTestResult.results[0].graphic) {
              const graphic = hitTestResult.results[0].graphic;
              HUC_ID = graphic.id 
              if(previousID !== HUC_ID){
                if (previousGraphic) {
                  if (previousGraphic.symbol === highlightSymbol){
                    previousGraphic.symbol = polygonSymbol
                  }
                }
                if (graphic.symbol !== chartHighlight) {
                  graphic.symbol = highlightSymbol;
                }
                previousID = HUC_ID
                previousGraphic = graphic
              }
            }
          })
        })
      }
    });

    // Generate chart on click
    let previousFeature;
    Chart.register(ChartDataLabels);
    view.on("click", (event) => {
      view.hitTest(event).then((hitTestResult) => {
        if (hitTestResult.results[0].graphic.id) {
          // Close legend expand
          if (expand.expanded = true) {
            expand.expanded = false
          }
          const clickedFeature = hitTestResult.results[0].graphic
          // Highlight clicked feature and reset previous feature
          clickedFeature.symbol = chartHighlight
          if (previousFeature) {
            if (previousFeature !== clickedFeature) {
              previousFeature.symbol = polygonSymbol
            }
          }
          previousFeature = clickedFeature
          const clickedGeom = clickedFeature.geometry
          const watershedName = clickedFeature.name
          const watershedArea = (clickedFeature.area/1000000).toFixed(2)
          let params = new ImageHistogramParameters({
            geometry:  clickedGeom,
          });
          view.goTo({
            geometry: clickedGeom, 
            zoom: 10
          })
          Sentinel2.computeHistograms(params).then((result) => {
            // Filter out empty and uneeded classes
            const allCounts = result.histograms[0].counts
            const ranges = [[1,2], [4,5], [7,11]]
            const filteredData = filterHist(allCounts, ranges);
            
            // Sum pixels in watershed
            const sum = result.histograms[0].counts.reduce((accumulator, current) => accumulator + current, 0);

            // Clear canvas for new chart
            let chartStatus = Chart.getChart("histogramDiv");
            if (chartStatus !== undefined) {
              destroyChart(chartStatus)
            }

            // Create and append the new canvas
            const chartDiv = document.createElement("div");
            chartDiv.id = "chartDiv"
            document.body.appendChild(chartDiv)
            const closeButton = document.createElement("button");
            closeButton.innerText = "X"
            closeButton.id = "closeButton"
            const histogramDiv = document.createElement("canvas");
            histogramDiv.id = "histogramDiv";
            chartDiv.append(closeButton, histogramDiv)

            // Adjust chart height for wide screens
            if (window.innerHeight < 600) {
              chartDiv.style.height = "70vh"
            }

            // Add expanded chart view option for desktop
            if (mobile === "f") {
              const expandChartButton = document.createElement("button");
              expandChartButton.innerText = "+"
              expandChartButton.id = "expandChartButton"
              chartDiv.append(expandChartButton)

              //listener
              expandChartButton.addEventListener("click", () => {
                expandChartButton.remove()
                chartDiv.style.maxWidth = "none"
                chartDiv.style.width = "100vw"
                chartDiv.style.height = "90vh"
                const minChartButton = document.createElement("button");
                minChartButton.innerText = "-"
                minChartButton.id = "minChartButton"
                chartDiv.append(minChartButton)
                minChartButton.addEventListener("click", () => {
                  chartDiv.style.maxWidth = "30rem"
                  chartDiv.style.width = "50vw"
                  if (window.innerHeight < 600) {
                    chartDiv.style.height = "70vh"
                  } else {
                    chartDiv.style.height = "40vh"
                  }
                  minChartButton.remove()
                  chartDiv.append(expandChartButton)
                })
              })
            }

            // Add event listener to close button
            closeButton.addEventListener("mouseup", () => {
              let chartStatus = Chart.getChart("histogramDiv");
              destroyChart(chartStatus)
              previousFeature.symbol = polygonSymbol
            })

            // Create new chart
            const histogramWidget = new Histogram({
              container: "chartDiv"
            });

            new Chart(histogramDiv, {
              type: 'bar',
              data: {
                labels: SentinelLabels,
                datasets: [{
                  data: (filteredData.map(number => (number / sum) * 100)),
                  borderWidth: 1,
                  backgroundColor: SentinelColors
                }]
              },
              options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  title: {
                    display: true,
                    color: "black",
                    text: [watershedName, "Area: " + watershedArea + " km2"],
                    font: {
                      size: 18,
                    },
                    padding: {
                      bottom: 30 // Add space below the title
                    }
                  },
                  legend: {
                    display: false,
                  },
                  datalabels: {
                    formatter: (value, ctx) => {
                      if (value >= 1 ) {
                        return displayValue = Math.round(value) + "%"
                      } else if (value > 0 && value < 1) {
                        return displayValue = "<1%"
                      } else {
                        return ''
                      }
                    },
                    anchor: 'end',
                    align: 'top',
                    labels: {
                      value: {
                        color: 'black',
                      }
                    },
                    font: {
                      weight: 'bold',
                      size: 13,
                    }
                  }
                },
                scales: {
                  x: {
                    ticks: {
                        maxRotation: 65,
                        minRotation: 65,
                        color: 'black',
                        font: {
                          size: 15,
                        } 
                    },
                    grid: {
                      display:false
                    } 
                  },
                  y: {
                    display: false,
                  }
                },
                layout: {
                  padding: {
                       top: 10
                  }
                }
              }
            });
            view.ui.add(histogramWidget, "bottom-right")
          });
        }
      })
    });

    view.when().then(() => {
      
      // Get slider and set initial opacity
      const opacitySlider = document.getElementById("opacitySlider");
      const opacityLabel = document.getElementById("opacityLabel");
      Sentinel2.opacity = 0.75
      opacityLabel.innerText = `Land Cover Opacity: 75%`;

      // Set up event listener for slider input changes
      opacitySlider.addEventListener("input", (event) => {
        const opacityValue = event.target.value;
        Sentinel2.opacity = opacityValue / 100;
        opacityLabel.innerText = `Land Cover Opacity: ${opacityValue}%`;
      });
     
      // Add slider as expand
      const slider = document.getElementById("slider-container");
      const sliderExpand = new Expand({
        view: view,
        content: slider,
        expandIconClass: "esri-icon-description",
        expanded: true
      });
      view.ui.add(sliderExpand, "bottom-left")

      // Close expands on mobile
      if (window.innerWidth < 500) {
        expand.expanded = false
        sliderExpand.expanded = false
      }
     
      // First query: get drainage subregion
      const query = new Query();
      query.where = "HUC4 = '0109'";
      query.outFields = ["*"];
      query.returnGeometry = true; 

      // Execute first query
      WBD_HUC4.queryFeatures(query).then((featureSet) => {
        const features = featureSet.features; 
        features.map((feature) => {
          return geom = feature.geometry
        });

        // Buffer HUC4 to cover all watersheds and generalize to speed up
        const generalizedPolygon = geometryEngine.generalize(geom, 100, true);
        const buffer = geometryEngine.geodesicBuffer(generalizedPolygon, 20, "kilometers");

        // Clip the land caver data using the buffered geometry
        const clipFunction = new RasterFunction({
          functionName: "Clip",
          functionArguments: {
            ClippingGeometry: buffer,
          },
          outputPixelType: "U8" 
        });

        // Apply color scheme to clipped raster data
        const colorFunction = new RasterFunction({
          functionName: "Colormap",
          functionArguments: {
            ClippingGeometry: buffer,
            Colormap: [ 
              [1, 26, 91, 171],
              [2, 53, 130, 33],
              [4, 135, 209, 158],
              [5, 255, 219, 92],
              [7, 237, 2, 42],
              [8, 237, 233, 228],
              [9, 200, 200, 200],
              [10, 242, 250, 255],
              [11, 239, 207, 168] 
            ],
            Raster: clipFunction // chain clip function 
          }
        });
        
        Sentinel2.rasterFunction = colorFunction;
        map.add(Sentinel2);
        
        // Second query: get subwatersheds within subregion
        const query2 = new Query({
          geometry: geom,
          spatialRelationship: "intersects",
          returnGeometry: true,
          outFields: ["*"]
        });
        
        // Execute second query
        WBD_HUC12.queryFeatures(query2).then((featureSet) => {
            const features2 = featureSet.features;
            waitForCollectionLength(features2, 140, filterWatersheds)
        });
      });
    })
  }
);
  