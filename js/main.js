window.onload = (function() {

    /*Map stuff*/
    let mapContainer;
    mapboxgl.accessToken = 'pk.eyJ1Ijoiam9leWtsZWUiLCJhIjoiMlRDV2lCSSJ9.ZmGAJU54Pa-z8KvwoVXVBw';

    mapContainer = new mapboxgl.Map({
        container: 'mapContainer', // container element id
        style: 'mapbox://styles/mapbox/light-v9',
        center: [7.8454780, 47.999], // initial map center in [lon, lat]
        zoom: 11.5
    });


    d3.csv("data/ALL-SYSTEMS-2018-06-14.csv", function(d) {
        return {
            System_ID: d.System_ID,
            Time_UTC: Date.parse(d.Time_UTC),
            Altitude: +d.Altitude,
            Latitude: +d.Latitude,
            Longitude: +d.Longitude,
            Temperature_diff_K: +d.Temperature_diff_K,
            // Absolute_temperature_degC: d.Absolute_temperature_degC,
            Relhumidity_diff_percent:  Math.floor(+d.Relhumidity_diff_percent / -5),
            // Relhumidity_percent: +d.Relhumidity_percent,
            Vapourpressure_diff_hPa: Math.floor(+d.Vapourpressure_diff_hPa/-0.8)
            // Vapourpressure_hPa: +d.Vapourpressure_hPa
        };
    }).then(data => {
        // filter data
        data = data.filter( (d, idx) => {
         if(idx%12 == 0) return d;
        })

        // get the unique sensor ids
        let sensorIds = data.map(d => {
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


        let selectedVariable = "Temperature_diff_K";
        let variableSelector = document.querySelector("#variables");
        variableSelector.value = selectedVariable;

        let legend = document.querySelector("#legend");

        

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

        mapContainer.on('load', function() {

            let slider = document.getElementById('slider')
            let startTime = Date.parse('2018-06-14T19:00:00.000Z')
            let endTime = Date.parse('2018-06-14T21:00:00.000Z')

            var color = d3.scaleLinear()
                .domain([-13, 4])
                .range(["brown", "steelblue"]);

            sensorIds.forEach(geojson => {
                mapContainer.addLayer({
                    id: geojson.id,
                    type: 'line',
                    source: {
                        type: 'geojson',
                        data: geojson
                    },
                    filter: ['<=', ['number', ['get', 'Time_UTC']], startTime],
                    layout:{
                        'line-cap': 'round'
                    },
                    paint: {
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
                    }
                })
            })


            variableSelector.addEventListener("change" ,(e) => {
                let currentPalette = mapContainer.getPaintProperty("01", 'line-color');
                
                selectedVariable = e.target.value;
                // change legend
                legend.innerHTML = "";

                currentPalette.stops.forEach(stop => {
                    // let legendItem = `<div class="legendItem" style="backround-color:${stop[1]}">${stop[0]}</div>`
                    let legendItem = document.createElement("div")
                    legendItem.classList.add('legendItem')
                    legendItem.style.setProperty("background-color", stop[1])

                    if(selectedVariable === "Temperature_diff_K"){
                        legendItem.innerHTML = stop[0]
                    } else if(selectedVariable === "Relhumidity_diff_percent"){
                        legendItem.innerHTML = Math.floor(stop[0] * -5)
                    } else if(selectedVariable === "Vapourpressure_diff_hPa"){
                        legendItem.innerHTML = (stop[0] * -0.8).toFixed(1)
                    } else{
                        legendItem.innerHTML = stop[0]
                    }
                    

                    legend.appendChild(legendItem)    
                })
                
                sensorIds.forEach(geojson => {
                    
                    currentPalette.property = selectedVariable;

                    mapContainer.setPaintProperty(geojson.id, 'line-color', currentPalette);
                })
                
            })
            variableSelector.dispatchEvent(new Event('change', { bubbles: false }));

            // set min
            slider.setAttribute("min", startTime)
            //set max
            slider.setAttribute("max", endTime)
            // set step
            slider.setAttribute("step", 1000*60*2);
            slider.setAttribute("val", startTime);
            // update text in the UI
            document.getElementById('active-time').innerText = new Date(startTime);

            slider.addEventListener('input', function(e) {
                let time =  parseInt(e.target.value);
                // update the map
                sensorIds.forEach(geojson => {
                    mapContainer.setFilter(geojson.id, ['<=', ['number', ['get', 'Time_UTC']], time]);
                })

                // update text in the UI
                document.getElementById('active-time').innerText = new Date(time);
            });


            // start and stop animation:
            var globalID;
            document.querySelector("#start").addEventListener('click', function() {
                
                // only when anim is done, restart
                if(slider.value >= endTime){
                    slider.value = startTime;    
                }
                
                globalID = setInterval(function() {
                    slider.stepUp();
                    slider.dispatchEvent(new Event('input', { bubbles: false }));
                    
                    if (slider.value >= endTime) {
                        clearInterval(globalID)
                    }

                    
                }, 100)
            });

            document.querySelector("#stop").addEventListener('click', function() {
                // cancelAnimationFrame(globalID);
                clearInterval(globalID)
            });

        }); // end on map load



    }); // end data load


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


})();