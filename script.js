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
         "esri/widgets/Legend"], 
  (esriConfig, Map, MapView, ImageryLayer, FeatureLayer, GeoJSONLayer, Graphic, GraphicsLayer, SimpleFillSymbol, Query, esriRequest, Legend) => {
    const map = new Map({
      basemap: "streets-night-vector"
    });
  
    const view = new MapView({
      container: "viewDiv",
      map: map,
      center: [-70.88045846458392, 42.03704144231204],
      zoom: 8
    });

    const graphicsLayer = new GraphicsLayer();
    map.add(graphicsLayer);

    const polygonSymbol = new SimpleFillSymbol({
      color: [255, 0, 0, 0.4], // Red with some transparency
      outline: {
        color: [255, 0, 0], // Red outline
        width: 2
      }
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
      const mapLayer = map.layers.getItemAt(1);
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

      // Query - move later
      const query = new Query();
      query.where = "HUC4 = '0109'";
      query.outFields = ["*"]; // Get all fields
      query.returnGeometry = true; 
      const HUC4_1090 = WBD_HUC4.queryFeatures(query).then((featureSet) => {
        // Process the features
        const features = featureSet.features; 
      
        // Convert features to GeoJSON
        const geojson = features.map((feature) => {
          return geom = feature.geometry
        });
        
        const query2 = new Query({
          geometry: geom,
          spatialRelationship: "intersects", // Use the appropriate spatial relationship
          returnGeometry: true,
          outFields: ["*"] // Specify the fields you want to retrieve
        });
        
        WBD_HUC12.queryFeatures(query2).then((featureSet) => {
          // Process the features
          const features2 = featureSet.features; 
        
          // Convert features to GeoJSON
          const geojson2 = features2.map((feature) => {
            return {
              geometry: feature.geometry,
              symbol: polygonSymbol
            }
          })
          view.graphics.addMany(geojson2);
          console.log(geojson2)
        })
      })
    })
  }
)