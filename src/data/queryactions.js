import { fetchWrapper } from './actions'
import { submissionapi_path } from '../localconf'

export const fetchProjects = () => {
  return fetchWrapper({
    path: submissionapi_path + 'graphql',
    body: JSON.stringify({
      'query': "query Test { project(first:100) {code, project_id}}"
    }),
    method: 'POST',
    handler: receiveProjects
  })
};

export const receiveProjects = ({status, data}) => {
  switch (status){
    case 200:
      return {
        type: 'RECEIVE_PROJECTS',
        data: data['data']['project'].map(p => p.project_id)
      };
    default:
      return {
        type: 'FETCH_ERROR',
        error: data
      }
  }
};

export const fetchNodeTypes = () => {
  return fetchWrapper({
    path: submissionapi_path + '_dictionary',
    method: 'GET',
    handler: receiveNodeTypes
  })
};

export const receiveNodeTypes = ({status, data}) =>{
  switch (status) {
    case 200:
      return {
        type: 'RECEIVE_NODE_TYPES',
        data: data['links'].map(link => link.split('/').pop())
      };
    default:
      return {
        type: 'FETCH_ERROR',
        error: data
      }
  }
};