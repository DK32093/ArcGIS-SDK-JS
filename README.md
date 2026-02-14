# ArcGIS-SDK-JS

 For this project, I was excited to dive into the ArcGIS Maps SDK for JavaScript and see what I could create using the free resources provided by ESRI. Working without a paid subscription or an API key, I crafted a responsive web application that shows users the distribution of different land cover types within subwatersheds near Boston, Massachusetts using data directly from the ArcGIS Living Atlas of the World.

My process:

•	I pulled the Sentinel-2 10m LULC data and set the time extent to 2023

•	I used queries to retrieve the subwatersheds (HUC 12s) within the Massachusetts-Rhode Island Coastal subregion (HUC 4)

•	I added functionality to extract land cover data from a selected subwatershed and display the data using chart.js

•	I combined the powerful capabilities of the SDK with my own custom content to create an engaging and interactive user experience

Try out the app on mobile or desktop browsers:  https://dk32093.github.io/ArcGIS-SDK-JS/

Land Cover data: https://www.arcgis.com/home/item.html?id=cfcb7609de5f478eb7666240902d4d3d

HUC 4 Subregions data: https://www.arcgis.com/home/item.html?id=b92b73b36ef74c5cba1e3035fce94623

HUC 12 Subwatersheds data:
https://www.arcgis.com/home/item.html?id=b60aa1d756b245cf9db03a92254af878
