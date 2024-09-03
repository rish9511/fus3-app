// import "leaflet"
// const { app, BrowserWindow } = require('electron')

// const createWindow = () => {
//   const win = new BrowserWindow({
//     width: 800,
//     height: 600
//   })

//   win.loadFile('index.html')
// }
// app.whenReady().then(() => {

//   createWindow()
// })

// import "./node_modules/l.movemarker"

import L from "leaflet"
import "l.movemarker"

console.log("running main.js file")
const map = L.map('map').setView([51.505, -0.09], 15);

const tiles = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
  maxZoom: 19,
  attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
}).addTo(map);

map.on('click', function(e) {
  console.log(e.latlng.lat, e.latlng.lng)
});


var aws_bucket_icon = L.icon({
    iconUrl: 'aws-s3.svg',
    // shadowUrl: 'leaf-shadow.png',
    iconSize:     [38, 95], // size of the icon
    shadowSize:   [50, 64], // size of the shadow
    iconAnchor:   [22, 94], // point of the icon which will correspond to marker's location
    shadowAnchor: [4, 62],  // the same for the shadow
    popupAnchor:  [-3, -76] // point from which the popup should open relative to the iconAnchor
});

var aws_bucket_icon_2 = L.icon({
    iconUrl: 'aws-s3.svg',
    // shadowUrl: 'leaf-shadow.png',
    iconSize:     [38, 95], // size of the icon
    shadowSize:   [50, 64], // size of the shadow
    iconAnchor:   [22, 94], // point of the icon which will correspond to marker's location
    shadowAnchor: [4, 62],  // the same for the shadow
    popupAnchor:  [-3, -76] // point from which the popup should open relative to the iconAnchor
});


L.marker([51.5, -0.09], {icon: aws_bucket_icon}).addTo(map);

L.marker([51.50008749807709, -0.1257419586181641], {icon: aws_bucket_icon_2}).addTo(map);

var polylineOptions = {
  animate: true,
  duration: 5000
}

var markerOptions = {
  animate: true,
  duration: 5000
}


const instance = L.moveMarker(
  [[51.5, -0.09], [51.50008749807709, -0.1257419586181641]],
  polylineOptions,
  markerOptions
).addTo(map)


console.log(instance.getMarker())



const { EmptyMessage } = require('./fuse_service/fuseservice_pb.js');
const { FuseClient } = require('./fuse_service/fuseservice_grpc_web_pb.js');

var client = new FuseClient('http://localhost:8080');

var emptyMessage = new EmptyMessage();

client.listBuckets(emptyMessage, {}, (err, response) => {
  if (err) {
    console.error('Error:', err);
  } else {
    console.log('Response:', response);
  }
});




// instance.addMoreLine([-8.822512, 115.186803], {
//   duration: 5000, // in milliseconds (optional)
//   speed: 25, // in km/h (optional)
//   rotateAngle: 141, // (required if rotateMarker enable)
//   animatePolyline: true, // (required)
// })



