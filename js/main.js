window.onload = (function() {
    /**
    @ App variables
    @*/
    let mapContainer,
        stopBtn,
        startBtn,
        variableSelector,
        selectedVariable,
        campaignSelector,
        selectedCampaign,
        legend,
        slider,
        startTime,
        endTime,
        paintStyle,
        animate,
        activeTime,
        time,
        activeIds;


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
            selectedVariable = variableSelector.value

            campaignSelector = document.querySelector("#campaign")
            selectedCampaign = campaignSelector.value;

            legend = document.querySelector("#legend");

            // set start and end time
            startTime = Date.parse('2018-06-14T19:00:00.000Z');
            endTime = Date.parse('2018-06-14T21:00:00.000Z');
            //  set slider props
            slider = document.getElementById('slider');
            slider.setAttribute("min", startTime)
            slider.setAttribute("max", endTime)
            slider.setAttribute("step", 1000 * 60 * 2);
            slider.setAttribute("value", startTime);

            time = slider.value;

            activeIds = [];

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

            // adjust slider time
            slider.addEventListener('input', function(e) {
                time = parseInt(e.target.value);
                // update text in the UI
                activeTime.innerText = new Date(time);
                // change map colors
                activeIds.forEach(id => {
                    mapContainer.setFilter(id, ['<=', ['number', ['get', 'Time_UTC']], parseInt(time) ]);    
                })
                
                // changeMapDataColors();
            });

            // adjust variables change 
            variableSelector.addEventListener("change", (e) => {
                selectedVariable = e.target.value;
                console.log(selectedVariable)
                makeLegend();

                activeIds.forEach(id => {
                    paintStyle['line-color'].property = selectedVariable;
                    mapContainer.setPaintProperty(id, 'line-color', paintStyle['line-color']);
                })
                // changeMapDataColors();
            });
            variableSelector.dispatchEvent(new Event('change', { bubbles: false }));

            // when campaign selector changes
            // reload the main
            campaignSelector.addEventListener("change", (e) => {
                selectedCampaign = e.target.value;
                console.log(selectedCampaign)

                if (selectedCampaign === 'ALL-SYSTEMS-2018-06-14') {
                    startTime = Date.parse('2018-06-14T19:00:00.000Z');
                    endTime = Date.parse('2018-06-14T21:00:00.000Z');
                }
                if (selectedCampaign === 'ALL-SYSTEMS-2018-06-19') {
                    startTime = Date.parse('2018-06-19T19:00:00.000Z');
                    endTime = Date.parse('2018-06-19T21:00:00.000Z');
                }
                //  set slider props
                time = new Date(startTime);
                slider.setAttribute("min", startTime)
                slider.setAttribute("max", endTime)
                slider.setAttribute("step", 1000 * 60 * 2);
                slider.setAttribute("value", startTime);
                activeTime.innerText = new Date(startTime);

                slider.dispatchEvent(new Event("input", {bubbles:false}));

                // remove the existing stuff
                activeIds.forEach(id => {
                    mapContainer.removeLayer(id)
                    mapContainer.removeSource(id)
                })

                MapApp.makeVizualization()
            })

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

        /**
        @ get campaign data
        */
        function getCampaignData() {
            return new Promise((resolve, reject) => {
                if (selectedCampaign !== undefined) {
                    resolve(selectedCampaign)
                } else {
                    reject("no campaign selected")
                }
            })
        }

        let loadSensorData = function(selectedCampaign){
            /*
            @ Parse CSV
            @*/
            function parseCsv(d) {
                return {
                    System_ID: d.System_ID,
                    Time_UTC: Date.parse(d.Time_UTC),
                    Altitude: +d.Altitude,
                    Latitude: +d.Latitude,
                    Longitude: +d.Longitude,
                    Temperature_diff_K: +d.Temperature_diff_K,
                    Relhumidity_diff_percent: +scaleToTempDiff(+d.Relhumidity_diff_percent, -5),
                    Vapourpressure_diff_hPa: +scaleToTempDiff(+d.Vapourpressure_diff_hPa, -0.8)
                };
            }

            
            return new Promise( (resolve, reject) =>{
                d3.csv(`data/${selectedCampaign}.csv`, parseCsv)
                .then( data => {
                    resolve(data);
                })
            })

            
        }

        let makeVizualization = function(){
            getCampaignData()
                .then(loadSensorData)
                .then(createLineSegments)
                .then(addLayersToMap)
                .then(applyMapStyles)
                .then(filterMapData)
        }


        return {
            init: init,
            makeVizualization: makeVizualization
        }

    })();



    Setup.init();
    MapApp.init();

    mapContainer.on('load', function() {
        MapApp.makeVizualization();
    })

    /**
    @  make()
    */
    // function make() {
    //     // get the campaign data first
    //     getCampaignData()
    //         // then load up your data
    //         .then(selectedCampaign => {
               
    //                 .then(createLineSegments)
    //                 .then(addLayersToMap)
    //                 .then(attachMapListeners)
    //         });
    // }


    


    function createLineSegments(data) {
        console.log(data.length)
        let sensorIds;
        activeIds = [];

        return new Promise((resolve, reject) => {

            // filter data
            data = data.filter((d, idx) => {
                if (idx % 2 == 0) return d;
            })

            // get the unique sensor ids
            sensorIds = data.map(d => {
                return d.System_ID;
            }).filter((v, i, a) => a.indexOf(v) === i);

            // create a data object
            sensorIds = sensorIds.map(d => {
                
                activeIds.push(d);

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

            console.log("create Line Segments", sensorIds.length)
            // resolve the sensorIds as promise
            if (sensorIds) {
                resolve(sensorIds)
            } else {
                reject("error with sensorIds")
            }
        })
    }


    function addLayersToMap(sensorIds) {

        console.log("addLayersToMap", sensorIds.length)
        return new Promise((resolve, reject) => {
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
            if (sensorIds) {
                resolve(sensorIds);
            } else {
                reject("error in addLayersToMap")
            }
        })
    };

    function makeLegend(){

      // change legend
      legend.innerHTML = "";

      paintStyle['line-color'].stops.forEach(stop => {
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

    }


    function applyMapStyles(sensorIds){ 
        console.log(sensorIds)
        sensorIds.forEach(geojson => {
            paintStyle['line-color'].property = selectedVariable;
            mapContainer.setPaintProperty(geojson.id, 'line-color', paintStyle['line-color']);
        })

        return new Promise( (resolve, reject) => {
          resolve(sensorIds);
        })
      
    } 


            


    function filterMapData(sensorIds){
      // update the map
      sensorIds.forEach(geojson => {
          mapContainer.setFilter(geojson.id, ['<=', ['number', ['get', 'Time_UTC']], parseInt(time) ]);
      })
    }

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