mapboxgl.accessToken = 'pk.eyJ1Ijoiam9leWtsZWUiLCJhIjoiMlRDV2lCSSJ9.ZmGAJU54Pa-z8KvwoVXVBw';

const mapContainer = new mapboxgl.Map({
    container: 'mapContainer', // container element id
    style: 'mapbox://styles/mapbox/light-v9',
    center: [7.8454780, 47.999], // initial map center in [lon, lat]
    zoom: 11.5
});