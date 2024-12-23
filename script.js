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
         "esri/symbols/TextSymbol"], 
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
   TextSymbol) => { 
    const map = new Map({
      basemap: "streets-night-vector"
    });

    const view = new MapView({
      container: "viewDiv",
      map: map,
      center: [-70.88045846458392, 42.03704144231204],
      zoom: 7
    });

    const Sentinel2 = new ImageryLayer({
      url: "https://ic.imagery1.arcgis.com/arcgis/rest/services/Sentinel2_10m_LandCover/ImageServer",
      format: "jpgpng",
     

      // rasterFunction: new RasterFunction({
      //   functionName: "YearFilter", // Example function name
      //   functionArguments: {
      //     Year: 2022
      //   }
      // })
    });
    map.add(Sentinel2);

    // Set time extent to 2023
    const timeExtent = {
      start: new Date(Date.UTC(2023, 0, 1)),
      end: new Date(Date.UTC(2023, 11, 31))
    };
    view.timeExtent = timeExtent;



    const labelClass = new LabelClass({
      symbol: new TextSymbol({
        color: "white",
        font: {
          family: "Arial",
          size: 10
        }
      }),
      labelExpressionInfo: {
        expression: "$feature.gaz_name" // Use the desired field for the label
      },
      labelPlacement: "above-center" // Adjust the placement as needed
    });

    const places = new FeatureLayer({
      url: "https://services2.arcgis.com/FiaPA4ga0iQKduv3/arcgis/rest/services/Geonames_Places_Points_v1/FeatureServer",
      labelingInfo: [labelClass]
    });
    console.log(places)
    map.add(places)

    const polygonSymbol = new SimpleFillSymbol({
      color: [0, 0, 0, 0],
      outline: {
        color: [0, 0, 0],
        width: 2
      }
    });

    const highlightSymbol = new SimpleFillSymbol({
      color: [0, 0, 255, 0.5],
      outline: {
        color: [0, 0, 255],
        width: 2
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
              graphic.symbol = highlightSymbol;
              previousID = HUC_ID
              previousGraphic = graphic
            }
          }
        })
      })
    });

    // Generate chart on click
    Chart.register(ChartDataLabels);
    view.on("click", (event) => {
      view.hitTest(event).then((hitTestResult) => {
        if (hitTestResult.results.length > 0 && hitTestResult.results[0].graphic) {
          const clickedFeature = hitTestResult.results[0].graphic
          let params = new ImageHistogramParameters({
            geometry:  clickedFeature.geometry,
          });
          Sentinel2.computeHistograms(params).then((result) => {
            // Filter out empty classes
            const allCounts = result.histograms[0].counts
            const ranges = [[1,2], [4,5], [7,11]]
            function filterHist(array, ranges) {
              return array.filter((_, index) => {
                return ranges.some(([start, end]) => index >= start && index <= end);
              });
            }
            const filteredData = filterHist(allCounts, ranges);
            
            // Sum pixels in watershed
            const sum = result.histograms[0].counts.reduce((accumulator, current) => accumulator + current, 0);

          
            
            // Clear canvas for new chart
            let chartStatus = Chart.getChart("histogramDiv");
            if (chartStatus != undefined) {
              chartStatus.destroy();
            }

            // Create chart
            const histogramWidget = new Histogram({
              container: "histogramDiv"
            });
            // get chart div then create histogramDiv and append as child
            const ctx = document.getElementById("histogramDiv");
            new Chart(ctx, {
              type: 'bar',
              data: {
                labels: ["Water", "Trees", "Flooded Veg.", "Crops", "Built Area", "Bare Ground", "Snow/Ice", "Clouds", "Rangeland"],
                datasets: [{
                  data: (filteredData.map(number => (number / sum) * 100)),
                  borderWidth: 1,
                  backgroundColor: [
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
                }]
              },
              options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
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
                        color: 'white',
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
                        color: 'white',
                        font: {
                          size: 15,
                        }
                    },
                    grid: {
                      display:false
                    } 
                  },
                  y: {
                    ticks: {
                      display: false
                    },
                    grid: {
                      display:false
                    } 
                  }
                },
                layout: {
                  padding: {
                       top: 25
                  }
                }
              }
            });
            view.ui.add(histogramWidget, "top-right")
          });
        }
      })
    })


    // reference
    // scales: {
    //   yAxes: [{
    //     ticks: {
    //       max : 100,    
    //       min : 0
    //     }
    //   }]
    // }

    
    
       

      
   

  


    view.when().then(() => {
      // Get HUC4 watersheds
      const WBD_HUC4 = new FeatureLayer({
        url: "https://services.arcgis.com/P3ePLMYs2RVChkJx/arcgis/rest/services/Watershed_Boundary_Dataset_HUC_4s/FeatureServer?f=pjson"
      });

      // Get HUC12 watersheds
      const WBD_HUC12 = new FeatureLayer({
        url: "https://services.arcgis.com/P3ePLMYs2RVChkJx/arcgis/rest/services/Watershed_Boundary_Dataset_HUC_12s/FeatureServer",
        renderer: {
          type: "simple",
          symbol: polygonSymbol
        }
      });
      // Add to map to include in legend - but only the subset are visible as graphics
      map.add(WBD_HUC12);
      WBD_HUC12.visible = false;

      // First query 
      const query = new Query();
      query.where = "HUC4 = '0109'";
      query.outFields = ["*"];
      query.returnGeometry = true; 

      WBD_HUC4.queryFeatures(query).then((featureSet) => {
        const features = featureSet.features; 
        features.map((feature) => {
          return geom = feature.geometry
        });
        
        // Second query
        const query2 = new Query({
          geometry: geom,
          spatialRelationship: "intersects",
          returnGeometry: true,
          outFields: ["*"]
        });
        
        WBD_HUC12.queryFeatures(query2).then((featureSet) => {
          const features2 = featureSet.features;
          // Check watershed size to prevent request size limit errors 
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
                length: feature.attributes.Shape__Length,
                area: feature.attributes.Shape__Area
              }
          })
          view.graphics.addMany(geojson2);
        });
      });
      // Legend
      const mapLayer = map.layers.getItemAt(0); // Land cover
      mapLayer.title = ""
      const mapLayer2 = map.layers.getItemAt(1); // Watershed boundaries
      const legend = new Legend({
        view: view,
        layerInfos: [
          {
            layer: mapLayer,
            sublayers: [{ id: 1 }],
            title: "2023 Land Cover Classes"
          },
          {
            layer: mapLayer2,
            title: "HUC 12 Watershed Boundaries"
          }
        ]
      }, "legend"); // Add class
      legend.respectLayerVisibility = false
      view.ui.add(legend, "bottom-right");

      // Remove No Data from legend after the widget redraws twice (once for each layer)
      let i = 0;
      function waitForCollectionLength(collection, targetLength, callback) {
        const checkInterval = setInterval(() => {
          if (collection.length === targetLength) {
            i += 1;
            if (i == 3) {
              clearInterval(checkInterval);
            } else {
              callback();
            }
          }
        }, 300) // Check every 100 milliseconds
      }
  
      // The callback function to remove the No Data legend item (last child)
      function removeNoDataFromLegend() {
        const parentElement = document.getElementsByClassName("esri-legend__layer-body")
        const Sentinel2Legend = parentElement[1];
        if (Sentinel2Legend) {
          const lastChild = Sentinel2Legend.lastElementChild;
          lastChild.remove();
        }
      }
        const parentElement = document.getElementsByClassName("esri-legend__layer-body")
        waitForCollectionLength(parentElement, 2, removeNoDataFromLegend) 
    })
  }
);
  