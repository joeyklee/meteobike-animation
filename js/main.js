window.onload = (function() {
    /**
    @ App variables
    @*/
    let mapContainer,
        stopBtn,
        startBtn,
        variableSelector,
        selectedVariable,
        legend,
        slider,
        startTime,
        endTime,
        paintStyle,
        animate,
        activeTime;


    /**
    @ setup stuffs
    @*/
    const Setup = (function() {

        const init = function() {
            loadElements();
            attachListeners();
        }

        const loadElements = function() {
            stopBtn = document.querySelector("#stop");
            startBtn = document.querySelector("#start");
            variableSelector = document.querySelector("#variables");
            selectedVariable = "Temperature_diff_K";
            legend = document.querySelector("#legend");

            startTime = Date.parse('2018-06-14T19:00:00.000Z');
            endTime = Date.parse('2018-06-14T21:00:00.000Z');
            //  set slider props
            slider = document.getElementById('slider');
            slider.setAttribute("min", startTime)
            slider.setAttribute("max", endTime)
            slider.setAttribute("step", 1000 * 60 * 2);
            slider.setAttribute("val", startTime);

            // update text in the UI
            activeTime = document.querySelector("#active-time")
            activeTime.innerText = new Date(startTime);


            // paint style
            paintStyle = {
                'line-width': 3,
                'line-color': {
                    "property": selectedVariable,
                    "stops": [
                        [-13, "#E3CEF6"],
                        [-12, "#BE81F7"],
                        [-11, "#5F04B4"],
                        [-10, "#084B8A"],
                        [-9, "#4000FF"],
                        [-8, "#2E64FE"],
                        [-7, "#819FF7"],
                        [-6, "#58D3F7"],
                        [-5, "#58FAD0"],
                        [-4, "#6FBF00"],
                        [-3, "#6FBF00"],
                        [-2, "#ABC200"],
                        [-1, "#C6A200"],
                        [0, "#CA6800"],
                        [1, "#CE2C00"],
                        [2, "#D50052"],
                        [3, "#DD00D9"],
                        [4, "#A100E1"]
                    ]
                }
            };

        }

        const attachListeners = function() {
            // start animation
            startBtn.addEventListener('click', function() {
                // only when anim is done, restart
                if (slider.value >= endTime) {
                    slider.value = startTime;
                }
                // apply setInterval function to animate()
                animate = setInterval(function() {
                    slider.stepUp();
                    slider.dispatchEvent(new Event('input', { bubbles: false }));

                    // when time is done, clearInterval()
                    if (slider.value >= endTime) {
                        clearInterval(animate)
                    }
                }, 100)
            });

            // stop animation 
            stopBtn.addEventListener('click', function() {
                // cancelAnimationFrame(globalID);
                clearInterval(animate)
            });

        } // end attachListeners


        return {
            init: init
        }

    })();


    /**
    @ map stuffs
    @*/
    const MapApp = (function() {

        /*Map stuff*/
        mapboxgl.accessToken = 'pk.eyJ1Ijoiam9leWtsZWUiLCJhIjoiMlRDV2lCSSJ9.ZmGAJU54Pa-z8KvwoVXVBw';

        const init = function() {
            loadElements();
        }

        const loadElements = function() {
            mapContainer = new mapboxgl.Map({
                container: 'mapContainer', // container element id
                style: 'mapbox://styles/mapbox/light-v9',
                center: [7.8454780, 47.999], // initial map center in [lon, lat]
                zoom: 11.5
            });
        }

        return {
            init: init
        }

    })();



    Setup.init();
    MapApp.init();




    /**
    @ Main
    @*/

    mapContainer.on('load', function() {
        d3.csv("data/ALL-SYSTEMS-2018-06-14.csv", function(d) {
                return {
                    System_ID: d.System_ID,
                    Time_UTC: Date.parse(d.Time_UTC),
                    Altitude: +d.Altitude,
                    Latitude: +d.Latitude,
                    Longitude: +d.Longitude,
                    Temperature_diff_K: +d.Temperature_diff_K,
                    Relhumidity_diff_percent: +scaleToTempDiff(+d.Relhumidity_diff_percent, -5),
                    Vapourpressure_diff_hPa: +scaleToTempDiff(+d.Vapourpressure_diff_hPa, -0.8)
                    // Absolute_temperature_degC: d.Absolute_temperature_degC,
                    // Relhumidity_percent: +d.Relhumidity_percent,
                    // Vapourpressure_hPa: +d.Vapourpressure_hPa
                };
            })
            .then(createLineSegments)
            .then(addLayersToMap)
            .then(sensorIds => {
              // 
              variableSelector.addEventListener("change", (e) => {
                  let currentPalette = mapContainer.getPaintProperty("01", 'line-color');

                  selectedVariable = e.target.value;
                  // change legend
                  legend.innerHTML = "";



                  currentPalette.stops.forEach(stop => {
                      // let legendItem = `<div class="legendItem" style="backround-color:${stop[1]}">${stop[0]}</div>`
                      let legendItem = document.createElement("div")
                      legendItem.classList.add('legendItem')
                      legendItem.style.setProperty("background-color", stop[1])

                      if (selectedVariable === "Temperature_diff_K") {
                          legendItem.innerHTML = stop[0]
                      } else if (selectedVariable === "Relhumidity_diff_percent") {
                          legendItem.innerHTML = unscaleFromTempDiff(stop[0], -5)
                      } else if (selectedVariable === "Vapourpressure_diff_hPa") {
                          legendItem.innerHTML = unscaleFromTempDiff(stop[0], -0.8)
                      } else {
                          legendItem.innerHTML = stop[0]
                      }

                      legend.appendChild(legendItem)
                  })

                  console.log(currentPalette);
                  sensorIds.forEach(geojson => {
                      currentPalette.property = selectedVariable;
                      mapContainer.setPaintProperty(geojson.id, 'line-color', currentPalette);
                  })

              })
              variableSelector.dispatchEvent(new Event('change', { bubbles: false }));


              slider.addEventListener('input', function(e) {
                  let time = parseInt(e.target.value);
                  // update the map
                  sensorIds.forEach(geojson => {
                      mapContainer.setFilter(geojson.id, ['<=', ['number', ['get', 'Time_UTC']], time]);
                  })

                  // update text in the UI
                  activeTime.innerText = new Date(time);
              });
            })


    }) // end map load


    function createLineSegments(data) {
        let sensorIds;

        return new Promise((resolve, reject) => {


            // filter data
            data = data.filter((d, idx) => {
                if (idx % 12 == 0) return d;
            })

            console.log(data);

            // get the unique sensor ids
            sensorIds = data.map(d => {
                return d.System_ID;
            }).filter((v, i, a) => a.indexOf(v) === i);

            // create a data object
            sensorIds = sensorIds.map(d => {
                return {
                    "type": "FeatureCollection",
                    "id": d,
                    "features": []
                }
            });

            variableSelector.value = selectedVariable;
            // fill the data in to each object
            sensorIds.forEach((geojson, idx1) => {
                data.forEach((row, idx2) => {

                    if (row.System_ID === geojson.id) {
                        let feat = new createNewFeature();
                        feat.properties = row;
                        // create a linestring feature for each feature using the beginning
                        // and end of each point 
                        // and using the data from the first point
                        if ((idx2 < data.length - 1) && (data[idx2].System_ID === data[idx2 + 1].System_ID)) {
                            feat.geometry.coordinates.push([row.Longitude, row.Latitude])
                            feat.geometry.coordinates.push([data[idx2 + 1].Longitude, data[idx2 + 1].Latitude])
                        } else {
                            feat.geometry.coordinates.push([row.Longitude, row.Latitude])
                            feat.geometry.coordinates.push([data[idx2 - 1].Longitude, data[idx2 - 1].Latitude])
                        }

                        geojson.features.push(feat)
                    }
                })
            })

            // resolve the sensorIds as promise
            if (sensorIds) {
                resolve(sensorIds)
            } else {
                reject("error with sensorIds")
            }
        })
    }


    function addLayersToMap(sensorIds) {

        return new Promise( (resolve, reject) => {
          // add layer and apply style
          sensorIds.forEach(geojson => {
              mapContainer.addLayer({
                  id: geojson.id,
                  type: 'line',
                  source: {
                      type: 'geojson',
                      data: geojson
                  },
                  filter: ['<=', ['number', ['get', 'Time_UTC']], startTime],
                  layout: {
                      'line-cap': 'round'
                  },
                  paint: paintStyle
              })
          })

          // pass data along
          if(sensorIds){
            resolve(sensorIds);  
          } else{
            reject("error in addLayersToMap")
          }
        })
    };


    /**
    @ helper functions
    @ */

    // create a  new geojson linestring
    function createNewFeature() {
        return {
            "type": "Feature",
            "properties": {},
            "geometry": {
                "type": "LineString",
                "coordinates": []
            }
        }
    }

    // scale data to tempDiff values
    function scaleToTempDiff(val, divisor) {
        return Math.floor(val / divisor).toFixed(1)
    }

    // unscale data to tempDiff values
    function unscaleFromTempDiff(val, multiplier) {
        return (val * multiplier).toFixed(1)
    }


})();