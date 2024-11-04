// es6 style
import L, { map } from "leaflet"
// import "./node_modules/l.movemarker"

// common js. why const ? // TODO: Common js syntax does not work
// const {L} = require("./node_modules/leaflet")


window.addEventListener('DOMContentLoaded', function(event) {
  console.log("Dom Content loaded")
});


window.addEventListener('load', async function(event) {
  console.log("Loaded everything")
  const mainMap = L.map('map', {
    center: L.latLng(0, 30),
    zoom: 3,
    minZoom: 3,
    maxZoom: 3
  });

  const tiles = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
  }).addTo(mainMap);

  mainMap.on('click', function(e) {
    console.log(e.latlng.lat, e.latlng.lng)
  });
  // const response = await getBuckets()
  // console.log(response)
  // const allBuckets = response.getAllbucketsList()
  // allBuckets.forEach(bucket => {
  //   console.log(bucket.getName())
  // })

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
});


async function getBuckets() {
    
  const { EmptyMessage, Buckets } = require('./fuse_service/fuseservice_pb.js');
  const { FuseClient, FusePromiseClient } = require('./fuse_service/fuseservice_grpc_web_pb.js');

  // TODO: can the same be done without using the promise client ? 
  var client = new FusePromiseClient('http://localhost:8080');

  var emptyMessage = new EmptyMessage();

  // client.listBuckets(emptyMessage, {})
  //   .then(response => {
  //     // const allBuckets = response.getAllbucketsList()
  //     // allBuckets.forEach(bucket => {
  //     //   console.log(bucket.getName())
  //     // });
  //     console.log("1")
  //     return response
  //     // console.log(response.getAllbucketsList())
  //   })
  //   .catch(err => {
  //     console.log("Err: ", err)
  //   })

  try {
    const response = await client.listBuckets(emptyMessage, {})
    return response.getAllbucketsList()
  } catch(err) {
    console.log("Err: ", err)
  }

  // client.listBuckets(emptyMessage, {}, (err, response) => {
  //   if (err) {
  //     console.error('Error:', err);
  //   } else {
  //     console.re
  //     return response
  //   }
  // });
}


// var aws_bucket_icon = L.icon({
//     iconUrl: 'aws-s3.svg',
//     // shadowUrl: 'leaf-shadow.png',
//     iconSize:     [38, 95], // size of the icon
//     shadowSize:   [50, 64], // size of the shadow
//     iconAnchor:   [22, 94], // point of the icon which will correspond to marker's location
//     shadowAnchor: [4, 62],  // the same for the shadow
//     popupAnchor:  [-3, -76] // point from which the popup should open relative to the iconAnchor
// });

// var aws_bucket_icon_2 = L.icon({
//     iconUrl: 'aws-s3.svg',
//     // shadowUrl: 'leaf-shadow.png',
//     iconSize:     [38, 95], // size of the icon
//     shadowSize:   [50, 64], // size of the shadow
//     iconAnchor:   [22, 94], // point of the icon which will correspond to marker's location
//     shadowAnchor: [4, 62],  // the same for the shadow
//     popupAnchor:  [-3, -76] // point from which the popup should open relative to the iconAnchor
// });


// L.marker([51.5, -0.09], {icon: aws_bucket_icon}).addTo(map);

// L.marker([51.50008749807709, -0.1257419586181641], {icon: aws_bucket_icon_2}).addTo(map);

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



