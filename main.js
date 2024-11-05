// es6 style
import L, { map } from "leaflet"
// import "./node_modules/l.movemarker"

const { EmptyMessage, FileTransferInput, FileTransferOutput } = require('./fuse_service/fuseservice_pb.js');
const { FuseClient, FusePromiseClient } = require('./fuse_service/fuseservice_grpc_web_pb.js');
// common js. why const ? // TODO: Common js syntax does not work
// const {L} = require("./node_modules/leaflet")


var mainMap;

window.addEventListener('DOMContentLoaded', function(event) {
  console.log("Dom Content loaded")
});


window.addEventListener('load', async function(event) {
  console.log("Loaded everything")
  mainMap = L.map('map', {
    center: L.latLng(0, 30),
    zoom: 3,
    minZoom: 3,
    maxZoom: 3
  });

  const tiles = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
  }).addTo(mainMap);

  

  getBuckets()
    .then(buckets => {
      buckets.forEach(bucket => {
        console.log(bucket.getName())
        var location = bucket.getLocation()
        console.log(location.getLatitude())
        console.log(location.getLongitude())
        var bucketIcon = L.icon({
            iconUrl: 'aws-s3.svg',
            iconSize:     [38, 95], // size of the icon
            shadowSize:   [50, 64], // size of the shadow
            iconAnchor:   [22, 94], // point of the icon which will correspond to marker's location
            shadowAnchor: [4, 62],  // the same for the shadow
            popupAnchor:  [-3, -76] // point from which the popup should open relative to the iconAnchor
        });
        L.marker([location.getLatitude(), location.getLongitude()], {icon: bucketIcon}).addTo(mainMap);
      })
    })
    .catch(err => {
      console.log("Err: ", err)
    })
    
    mainMap.on('click', function(e) {
        console.log("Click on map")
        var client = new FuseClient('http://localhost:8080');
        var transferInput = new FileTransferInput()
        transferInput.setSourcepath("/buckets/b1/file_path")
        transferInput.setDestinationpath("/buckets/b2/file_path")
        var stream = client.copyFile(transferInput, {})
        stream.on('data', (response) => {
          console.log('response from server ', response)
        });

        stream.on('status', (status) => {
          console.log(status.code)
        });

        stream.on('error', (err) => {
          console.log("error while reading stream ", err)
        });

        stream.on('end', (end) => {
          console.log('stream reached eof')
          stream.cancel()
        });

        
      });
});


async function getBuckets() {
    
  // const { EmptyMessage, Buckets } = require('./fuse_service/fuseservice_pb.js');
  // const { FuseClient, FusePromiseClient } = require('./fuse_service/fuseservice_grpc_web_pb.js');

  // TODO: can the same be done without using the promise client ? 
  var client = new FusePromiseClient('http://localhost:8080');

  var emptyMessage = new EmptyMessage();

  try {
    const response = await client.listBuckets(emptyMessage, {})
    return response.getAllbucketsList()
  } catch(err) {
    console.log("Err: ", err)
  }

}



// var polylineOptions = {
//   animate: true,
//   duration: 5000
// }

// var markerOptions = {
//   animate: true,
//   duration: 5000
// }


// const instance = L.moveMarker(
//   [[51.5, -0.09], [51.50008749807709, -0.1257419586181641]],
//   polylineOptions,
//   markerOptions
// ).addTo(map)


// console.log(instance.getMarker())


// instance.addMoreLine([-8.822512, 115.186803], {
//   duration: 5000, // in milliseconds (optional)
//   speed: 25, // in km/h (optional)
//   rotateAngle: 141, // (required if rotateMarker enable)
//   animatePolyline: true, // (required)
// })



