import { connect } from 'react-redux';
import Covid19Dashboard from '../Covid19Dashboard';

import { covid19DashboardConfig } from '../localconf';
import { readSingleColumnTSV, readMultiColumnTSV } from './dataUtils.js';


let dataUrl = covid19DashboardConfig.dataUrl;
dataUrl = !dataUrl.endsWith('/') ? `${dataUrl}/` : dataUrl;


async function handleDashboardData(propName, data) {
  switch (propName) {
  case 'jhuGeojsonLatest':
  case 'jhuJsonByLevelLatest':
    return JSON.parse(data);
  case 'seirObservedChartData':
  case 'seirSimulatedChartData':
    return readSingleColumnTSV(data);
  case 'top10ChartData':
  case 'idphDailyChartData':
    return readMultiColumnTSV(data);
  default:
    console.warn(`I don't know how to handle dashboard data for "${propName}"`); // eslint-disable-line no-console
    // return 'ERROR_FETCH_DASHBOARD_DATA';
  }
  return null;
}

const fetchDashboardData = (propName, filePath) => {
  const url = dataUrl + filePath;
  // TODO refactor this probably. to handle errors better
  return dispatch => fetch(url, dispatch)
    .then((r) => {
      switch (r.status) {
      case 200:
        return r.text();
      default:
        console.error(`Got code ${r.status} when fetching dashboard data at "${url}"`); // eslint-disable-line no-console
      }
      return '';
    })
    .catch(
      error => console.error(`Unable to fetch dashboard data at "${url}":`, error), // eslint-disable-line no-console
    )
    .then(data => handleDashboardData(propName, data))
    .then(obj =>
      // switch (obj) {
      // case 'ERROR_FETCH_DASHBOARD_DATA':
      //   return {
      //     type: 'ERROR_FETCH_DASHBOARD_DATA',
      //   };
      // default:
      ({
        type: 'RECEIVE_DASHBOARD_DATA',
        name: propName,
        contents: obj,
      }),
      // }
    )
    .then(msg => dispatch(msg));
};

const fetchTimeSeriesData = (dataLevel, locationId, title) => {
  const url = `${dataUrl}time_series/${dataLevel}/${locationId}.json`;
  return (dispatch) => {
    dispatch(
      {
        type: 'OPEN_TIME_SERIES_POPUP',
        title,
      },
    );
    return fetch(url, dispatch).then((r) => {
      switch (r.status) {
      case 200:
        return r.text();
      default:
        console.error(`Got code ${r.status} when fetching time series data at "${url}"`); // eslint-disable-line no-console
      }
      return '';
    })
      .catch(
        error => console.error(`Unable to fetch time series data at "${url}":`, error), // eslint-disable-line no-console
      )
      .then(data => ({
        type: 'RECEIVE_TIME_SERIES_DATA',
        title,
        contents: JSON.parse(data),
      }),
      )
      .then(msg => dispatch(msg));
  };
};

const closeLocationPopup = () => dispatch => dispatch(
  { type: 'CLOSE_TIME_SERIES_POPUP' },
);

const mapStateToProps = state => ({
  ...state.covid19Dashboard,
});

const mapDispatchToProps = dispatch => ({
  fetchDashboardData: (propName, filePath) => dispatch(
    fetchDashboardData(propName, filePath),
  ),
  fetchTimeSeriesData: (dataLevel, locationId, title) => dispatch(
    fetchTimeSeriesData(dataLevel, locationId, title),
  ),
  closeLocationPopup: () => dispatch(
    closeLocationPopup(),
  ),
});

const ReduxCovid19Dashboard = connect(mapStateToProps, mapDispatchToProps)(Covid19Dashboard);

export default ReduxCovid19Dashboard;