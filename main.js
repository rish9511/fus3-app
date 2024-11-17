// es6 style
import L, { map } from "leaflet"
import "./node_modules/l.movemarker"

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
        transferInput.setSourcepath("/home/zboon/satya.mkv")
        transferInput.setDestinationpath("/home/zboon/buckets/b2/satya.mkv")
        var stream = client.copyFile(transferInput, {})
        var totalBytesTransferred = 0
        
        var opts = {
          duration: 100000 // start at a slow speed
        }
        var latLngs = [[36.87962060502676, -99.140625], [20.632784250388028, 78.92578125000001]] 
        var motionInstance = L.motionMarker(latLngs, opts)
        var polyLine = L.polyline(latLngs)
        motionInstance.addTo(mainMap)
        polyLine.addTo(mainMap)

        stream.on('data', (response) => {
          var bytesTransferred = response.getBytestransferred()
          console.log('response from server ', bytesTransferred)
          totalBytesTransferred += bytesTransferred
          console.log(totalBytesTransferred)
          if (totalBytesTransferred > 20000000) {
            var duration = response.getTimerequired()
            duration = duration * 1000 // convert to milliseconds
            var options = {
              duration: duration
            }
            var nextLatLng = [20.632784250388028, 78.92578125000001]
            var currentLatLng = [motionInstance.getLatLng().lat, motionInstance.getLatLng().lng] 
            motionInstance._prevLatLng = currentLatLng
            motionInstance.moveTo(nextLatLng, options)
          }
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