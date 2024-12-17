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
         "esri/core/reactiveUtils"], 
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
   reactiveUtils) => {
    const map = new Map({
      basemap: "streets-night-vector"
    });
  
    const view = new MapView({
      container: "viewDiv",
      map: map,
      center: [-70.88045846458392, 42.03704144231204],
      zoom: 8
    });

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

    view.when().then(() => {
      // Add land cover
      const Sentinel2 = new ImageryLayer({
        url: "https://ic.imagery1.arcgis.com/arcgis/rest/services/Sentinel2_10m_LandCover/ImageServer",
        format: "jpgpng"
      });
      map.add(Sentinel2);

      // Add watersheds
      const WBD_HUC4 = new FeatureLayer({
        url: "https://services.arcgis.com/P3ePLMYs2RVChkJx/arcgis/rest/services/Watershed_Boundary_Dataset_HUC_4s/FeatureServer?f=pjson"
      });
      //map.add(WBD_HUC4);

      // Add watersheds
      const WBD_HUC12 = new FeatureLayer({
        url: "https://services.arcgis.com/P3ePLMYs2RVChkJx/arcgis/rest/services/Watershed_Boundary_Dataset_HUC_12s/FeatureServer"
      });
      

      // get the first layer in the collection of operational layers in the WebMap
      // when the resources in the MapView have loaded.
      const mapLayer = map.layers.getItemAt(0);
      mapLayer.title = "Land Cover Classes"
  
      const legend = new Legend({
        view: view,
        layerInfos: [
          {
            layer: mapLayer,
            title: ""
          }
        ]
      });
  
      // Add widget to the bottom right corner of the view
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
          spatialRelationship: "intersects", // Use the appropriate spatial relationship
          returnGeometry: true,
          outFields: ["*"] // Specify the fields you want to retrieve
        });
        
        WBD_HUC12.queryFeatures(query2).then((featureSet) => {
          const features2 = featureSet.features; 
          const geojson2 = features2.map((feature) => {
            return {
              geometry: feature.geometry,
              symbol: polygonSymbol,
              id: feature.attributes.HUC12
            }
          })
          view.graphics.addMany(geojson2);
        });
      });
    });
  }
);
  