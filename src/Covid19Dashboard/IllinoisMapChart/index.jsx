import React from 'react';
import PropTypes from 'prop-types';
import * as ReactMapGL from 'react-map-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

import { mapboxAPIToken } from '../../localconf';
import ControlPanel from '../ControlPanel';
import { numberWithCommas } from '../dataUtils.js';
import countyData from '../data/us_counties';

function addDataToGeoJsonBase(data) {
  // Only select Illinois data.
  // Chicago (FIPS 17999) is separate from Cook county in `countyData`,
  // but not in JHU data. So don't display Chicago separately.
  const base = {
    ...countyData,
    features: countyData.features.filter(f => f.properties.STATE === 'IL' && f.properties.FIPS !== '17999'),
  };
  const geoJson = {
    ...base,
    features: base.features.map((loc) => {
      const location = loc;
      if (location.properties.FIPS && !(location.properties.FIPS in data)) {
        // `countyData` stores FIPS with trailing zeros, JHU data doesn't
        location.properties.FIPS = Number(location.properties.FIPS).toString();
      }
      if (location.properties.FIPS && location.properties.FIPS in data) {
        location.properties = Object.assign(
          data[location.properties.FIPS],
          location.properties,
        );
        return location;
      }

      // no data for this location
      location.properties.confirmed = 0;
      location.properties.deaths = 0;
      return location;
    }),
  };

  return geoJson;
}

class IllinoisMapChart extends React.Component {
  constructor(props) {
    super(props);
    this.updateDimensions = this.updateDimensions.bind(this);
    this.choroCountyGeoJson = null;
    this.state = {
      mapSize: {
        width: '100%',
        height: window.innerHeight - 221,
      },
      viewport: {
        // start centered on Chicago
        longitude: -90,
        latitude: 40,
        zoom: 6,
        bearing: 0,
        pitch: 0,
      },
      hoverInfo: null,
    };
  }

  componentDidMount() {
    window.addEventListener('resize', this.updateDimensions);
  }

  onHover = (event) => {
    let hoverInfo = null;

    if (!event.features) { return; }

    event.features.forEach((feature) => {
      if (feature.layer.id !== 'confirmed-choropleth') {
        return;
      }
      let confirmed = feature.properties.confirmed;
      confirmed = confirmed && confirmed !== 'null' ? confirmed : 0;
      let deaths = feature.properties.deaths;
      deaths = deaths && deaths !== 'null' ? deaths : 0;
      let recovered = feature.properties.recovered;
      recovered = recovered && recovered !== 'null' ? recovered : 0;

      const state = feature.properties.STATE;
      const county = feature.properties.COUNTYNAME;
      let locationName = 'US';
      locationName = (state && state !== 'null' ? `${state}, ` : '') + locationName;
      locationName = (county && county !== 'null' ? `${county}, ` : '') + locationName;
      hoverInfo = {
        lngLat: event.lngLat,
        locationName,
        values: {
          'confirmed cases': numberWithCommas(confirmed),
          deaths: numberWithCommas(deaths),
        },
      };
      if (recovered) {
        hoverInfo.values.recovered = numberWithCommas(recovered);
      }
    });

    this.setState({
      hoverInfo,
    });
  };

  onClick = (event) => {
    if (!event.features) { return; }

    event.features.forEach((feature) => {
      if (feature.layer.id === 'confirmed-choropleth') {
        const title = `${feature.properties.county}, ${feature.properties.province_state}`;
        this.props.fetchTimeSeriesData('county', feature.properties.FIPS, title);
      }
    });
  }

  updateDimensions() {
    this.setState({
      mapSize: { width: '100%', height: window.innerHeight - 221 },
    });
  }

  renderPopup() {
    const { hoverInfo } = this.state;
    if (hoverInfo) {
      return (
        <ReactMapGL.Popup
          longitude={hoverInfo.lngLat[0]}
          latitude={hoverInfo.lngLat[1]}
          closeButton={false}
        >
          <div className='location-info'>
            <h4>
              {hoverInfo.locationName}
            </h4>
            {
              Object.entries(hoverInfo.values).map(
                (val, i) => <p key={i}>{`${val[1]} ${val[0]}`}</p>,
              )
            }
            <p className='covid19-dashboard__location-info__details'>Click for more details</p>
          </div>
        </ReactMapGL.Popup>
      );
    }
    return null;
  }

  render() {
    if (Object.keys(this.props.jsonByLevel.country).length && !this.choroCountyGeoJson) {
      this.choroCountyGeoJson = addDataToGeoJsonBase(
        this.props.jsonByLevel.county,
      );
    }

    const colors = {
      0: '#FFF',
      1: '#F7F787',
      20: '#EED322',
      50: '#E6B71E',
      100: '#DA9C20',
      500: '#CA8323',
      1000: '#B86B25',
      2500: '#A25626',
      5000: '#8B4225',
      10000: '#850001',
    };
    const colorsAsList = Object.entries(colors).map(item => [+item[0], item[1]]).flat();

    return (
      <div className='map-chart'>
        <ControlPanel
          showMapStyle={false}
          showLegend={this.state.selectedLayer !== 'confirmed-choropleth'}
          colors={colors}
        />
        <ReactMapGL.InteractiveMap
          className='.map-chart__mapgl-map'
          mapboxApiAccessToken={mapboxAPIToken}
          mapStyle='mapbox://styles/mapbox/streets-v11'
          {...this.state.viewport}
          {...this.state.mapSize} // after viewport to avoid size overwrite
          onViewportChange={(viewport) => {
            this.setState({ viewport });
          }}
          onHover={this.onHover}
          onClick={this.onClick}
          dragRotate={false}
          touchRotate={false}
          // maxBounds={[ // doesn't work
          //   [-74.04728500751165, 40.68392799015035], // Southwest coordinates
          //   [-73.91058699000139, 40.87764500765852] // Northeast coordinates
          // ]}
        >
          {this.renderPopup()}
          <ReactMapGL.Source type='geojson' data={this.choroCountyGeoJson}>
            <ReactMapGL.Layer
              id='confirmed-choropleth'
              type='fill'
              beforeId='waterway-label'
              paint={{
                'fill-color': [
                  'interpolate',
                  ['linear'],
                  ['number', ['get', 'confirmed']],
                  ...colorsAsList,
                ],
                'fill-opacity': 0.6,
              }}
            />
          </ReactMapGL.Source>
        </ReactMapGL.InteractiveMap>
      </div>
    );
  }
}

IllinoisMapChart.propTypes = {
  jsonByLevel: PropTypes.object.isRequired,
  fetchTimeSeriesData: PropTypes.func.isRequired,
};

export default IllinoisMapChart;