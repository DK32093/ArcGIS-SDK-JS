require(["esri/config",
         "esri/Map", 
         "esri/views/MapView", 
         "esri/layers/ImageryLayer", //possibly revert to imagelayer
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
         "https://cdnjs.cloudflare.com/ajax/libs/Chart.js/2.7.2/Chart.js"], 
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
   Chart) => { // update chart.js version to 3.x plus to make this work - this might make it necessary to add plugin to legend display = false tree in option
    const map = new Map({
      basemap: "streets-night-vector"
    });

    const view = new MapView({
      container: "viewDiv",
      map: map,
      center: [-70.88045846458392, 42.03704144231204],
      zoom: 8
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


    //const graphicsLayer = new GraphicsLayer();
    //map.add(graphicsLayer);

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
    view.on("click", (event) => {
      view.hitTest(event).then((hitTestResult) => {
        if (hitTestResult.results.length > 0 && hitTestResult.results[0].graphic) {
          const clickedFeature = hitTestResult.results[0].graphic
          console.log(clickedFeature.length)
          let params = new ImageHistogramParameters({
            geometry:  clickedFeature.geometry,
          });
          Sentinel2.computeHistograms(params).then((result) => {
            console.log(result.histograms)
            
            // Filter out empty classes
            const allCounts = result.histograms[0].counts
            console.log(allCounts)
            const ranges = [[1,2], [4,5], [7,11]]
            function filterHist(array, ranges) {
              return array.filter((_, index) => {
                return ranges.some(([start, end]) => index >= start && index <= end);
              });
            }
            const filteredData = filterHist(allCounts, ranges);
            console.log(filteredData); 
            
            // Sum pixels in watershed
            const sum = result.histograms[0].counts.reduce((accumulator, current) => accumulator + current, 0);

            // Create chart
            const histogramWidget = new Histogram({
              container: "histogramDiv"
            });
            const ctx = document.getElementById("histogramDiv");
            new Chart(ctx, {
              type: 'bar',
              data: {
                labels: ["1", "2", "4", "5", "7", "8", "9", "10", "11"],
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
                events: [],
                legend: {
                  display: false 
                },
                // scales: {
                //   yAxes: [{
                //     ticks: {
                //       max : 100,    
                //       min : 0
                //     }
                //   }]
                // }
              }
            });

            view.ui.add(histogramWidget, "top-right")
          });
        }
      })
    })

    view.when().then(() => {
      // Get HUC4 watersheds
      const WBD_HUC4 = new FeatureLayer({
        url: "https://services.arcgis.com/P3ePLMYs2RVChkJx/arcgis/rest/services/Watershed_Boundary_Dataset_HUC_4s/FeatureServer?f=pjson"
      });

      // Get HUC12 watersheds
      const WBD_HUC12 = new FeatureLayer({
        url: "https://services.arcgis.com/P3ePLMYs2RVChkJx/arcgis/rest/services/Watershed_Boundary_Dataset_HUC_12s/FeatureServer"
      });
      
      // Legend
      const mapLayer = map.layers.getItemAt(0); // get first layer
      mapLayer.title = "2023 Land Cover Classes"
      const legend = new Legend({
        view: view,
        layerInfos: [
          {
            layer: mapLayer,
            title: ""
          }
        ]
      });
      view.ui.add(legend, "bottom-right");

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
    });
  }
);
  