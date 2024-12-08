require(["esri/config", "esri/Map", "esri/views/MapView", "esri/layers/ImageryLayer", "esri/widgets/Legend"], 
    (esriConfig, Map, MapView, ImageryLayer, Legend) => {
    const map = new Map({
      basemap: "streets-night-vector"
    });

    const view = new MapView({
      container: "viewDiv",
      map: map,
      center: [-71.1097, 42.3736],
      zoom: 5
    });

    const Sentinel2 = new ImageryLayer({
      url: "https://ic.imagery1.arcgis.com/arcgis/rest/services/Sentinel2_10m_LandCover/ImageServer",
      format: "jpgpng"
    });

    map.add(Sentinel2);

    view.when(() => {
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
    });
  });