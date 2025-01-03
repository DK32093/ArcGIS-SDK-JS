require(["esri/config",
         "esri/Map", 
         "esri/views/MapView", 
         "esri/layers/ImageryLayer",
         "esri/layers/FeatureLayer",
         "esri/layers/GeoJSONLayer",
         "esri/Graphic",
         "esri/layers/GraphicsLayer",
         "esri/symbols/SimpleFillSymbol",
         "esri/rest/support/Query",
         "esri/request",
         "esri/widgets/Legend",
         "esri/core/reactiveUtils",
         "esri/layers/support/RasterFunction",
         "esri/geometry/Polygon",
         "esri/rest/support/ImageIdentifyParameters",
         "esri/rest/support/ImageHistogramParameters",
         "esri/widgets/Histogram",
         "esri/layers/support/LabelClass",
         "esri/symbols/TextSymbol",
         "esri/widgets/Expand"], 
  (esriConfig, 
   Map, 
   MapView, 
   ImageryLayer, 
   FeatureLayer, 
   GeoJSONLayer, 
   Graphic, 
   GraphicsLayer, 
   SimpleFillSymbol, 
   Query, 
   esriRequest, 
   Legend,
   reactiveUtils,
   RasterFunction,
   Polygon,
   ImageIdentifyParameters,
   ImageHistogramParameters,
   Histogram,
   LabelClass,
   TextSymbol,
   Expand) => { 
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

    const Sentinel2 = new ImageryLayer({
      url: "https://ic.imagery1.arcgis.com/arcgis/rest/services/Sentinel2_10m_LandCover/ImageServer",
      format: "jpgpng",
    });
    map.add(Sentinel2);

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
    map.add(WBD_HUC4)
    WBD_HUC4.visible = false

    // Get HUC 12 watersheds
    const WBD_HUC12 = new FeatureLayer({
      url: "https://services.arcgis.com/P3ePLMYs2RVChkJx/arcgis/rest/services/Watershed_Boundary_Dataset_HUC_12s/FeatureServer",
      simplify: true
    });
    map.add(WBD_HUC12)
    WBD_HUC12.visible = false

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
        color: [0, 0, 255],
        width: 2
      }
    });

    // Current chart area
    const chartHighlight = new SimpleFillSymbol({
      color: [255, 255, 255, 0.5],
      outline: {
        color: [255, 255, 255],
        width: 2
      }
    });

    // Function for clearing chart
    function destroyChart(chartStatus) {
      chartStatus.destroy();
      const previousDiv = document.getElementById("histogramDiv");
      const previousClose = document.getElementById("closeButton");
      const previousChart = document.getElementById("chartDiv");
      previousDiv.remove()
      previousClose.remove()
      previousChart.remove()
    }

    // Function for removing empty classes from charts
    function filterHist(array, ranges) {
      return array.filter((_, index) => {
        return ranges.some(([start, end]) => index >= start && index <= end);
      });
    }

    // Info button: Remove and add welcome div on click
    const infoButton = document.getElementById("infoButton");
    const triangle = document.getElementById("triangle");
    const welcomeContainer = document.getElementById("welcomeContainer");
    infoButton.addEventListener("click", function() {
      if (welcomeContainer.style.display === "none") {
        welcomeContainer.style.display = "unset"
        triangle.style.display = "unset"
      } else {
        welcomeContainer.style.display = "none"
        triangle.style.display = "none"
      }
    });

    // Highlight on hover logic
    let previousID;
    let previousGraphic;
    view.graphics.watch("length", () => {
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
    });

    // Generate chart on click
    let previousFeature;
    Chart.register(ChartDataLabels);
    view.on("click", (event) => {
      view.hitTest(event).then((hitTestResult) => {
        if (hitTestResult.results.length > 0 && hitTestResult.results[0].graphic) {
          const clickedFeature = hitTestResult.results[0].graphic
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
          view.goTo(clickedGeom)
          Sentinel2.computeHistograms(params).then((result) => {
            // Filter out empty classes
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

            // Add event listener to close button
            closeButton.addEventListener("click", function() {
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
                      size: 20,
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
                      size: 16,
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
    })

    // Create custom legend
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
      expandIconClass: "esri-icon-description", // Optional: Set a custom icon
      expanded: true // Optional: Start collapsed
    });

    view.ui.add(expand, "top-right")

    view.when().then(() => {
      
      // Get slider and set initial opacity
      const opacitySlider = document.getElementById("opacitySlider");
      const opacityLabel = document.getElementById("opacityLabel");
      Sentinel2.opacity = 0.75
      opacityLabel.innerText = `Land Cover Opacity: 75%`;

      // Set up event listener for slider input changes
      opacitySlider.addEventListener("input", function (event) {
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
     
      // First query: get drainage subregion
      const query = new Query();
      query.where = "HUC4 = '0109'";
      query.outFields = ["*"];
      query.returnGeometry = true; 

      // Wait for subregions to load before executing query
      view.whenLayerView(WBD_HUC4).then((layerView) => {
        reactiveUtils.whenOnce(() => !layerView.updating).then(() => {
          WBD_HUC4.queryFeatures(query).then((featureSet) => {
            const features = featureSet.features; 
            features.map((feature) => {
              return geom = feature.geometry
            });
            
            // Second query: get subwatersheds within subregion
            const query2 = new Query({
              geometry: geom,
              spatialRelationship: "intersects",
              returnGeometry: true,
              outFields: ["*"]
            });
            
            // Wait for subwatersheds to load before executing query
            view.whenLayerView(WBD_HUC12).then((layerView) => {
              reactiveUtils.whenOnce(() => !layerView.updating).then(() => {
                WBD_HUC12.queryFeatures(query2).then((featureSet) => {
                  const features2 = featureSet.features;
                  // Check watershed size to prevent request-size-limit errors 
                  features2.forEach((feature) => {
                    const length = feature.attributes.Shape__Length
                    const area = feature.attributes.Shape__Area
                    if (length > 130000 || area > 320000000) {
                      const id = feature.attributes.HUC12
                      const index = features2.findIndex(feature => {
                        return feature.attributes.HUC12 === id;
                      });
                      features2.splice(index, 1);
                    }
                  })
                  const geojson2 = features2.map((feature) => {
                    return {
                      geometry: feature.geometry,
                      symbol: polygonSymbol,
                      id: feature.attributes.HUC12,
                      name: feature.attributes.NAME,
                      length: feature.attributes.Shape__Length,
                      area: feature.attributes.Shape__Area
                    }
                  })
                  view.graphics.addMany(geojson2);
                });
              });
            });
          });
        });
      });
    })
  }
);
  