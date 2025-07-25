import React, { useEffect, useState } from 'react';
import { RouteComponentProps } from 'react-router-dom';
import {
  Col, Row, Button, Popover,
} from 'antd';
import { DiscoveryConfig } from '../../../../../../DiscoveryConfig';
import { DiscoveryResource } from '../../../../../../Discovery';
import { UseHandleRedirectToLoginClickNonResumable } from '../../../../../../Utils/HandleRedirectToLoginClick';
import HandleDownloadManifestClick from './DownloadUtils/HandleDownloadManifestClick';
import DownloadDataFiles from './DownloadUtils/DownloadDataFiles/DownloadDataFiles';
import DownloadJsonFile from './DownloadUtils/DownloadJsonFile';
import DownloadVariableMetadata from './DownloadUtils/DownloadVariableMetadata/DownloadVariableMetadata';
import './ActionButtons.css';
import DownloadVariableMetadataInfo from './DownloadUtils/DownloadVariableMetadataInfo';
import VariableLevelMetadata from '../Interfaces/VariableLevelMetadata';
import DownloadStatus from '../Interfaces/DownloadStatus';
import isManifestDataMissing from '../../../../../../Utils/isManifestDataMissing';
import assembleFileMetadata from '../../../../../../DiscoveryActionBar/utils/assembleFileMetadata';

interface ActionButtonsProps {
  isUserLoggedIn: boolean;
  userHasAccessToDownload: boolean;
  discoveryConfig: DiscoveryConfig;
  resourceInfo: DiscoveryResource;
  missingRequiredIdentityProviders: string[];
  noData: boolean;
  downloadStatus: DownloadStatus;
  setDownloadStatus: React.Dispatch<React.SetStateAction<DownloadStatus>>;
  history: RouteComponentProps['history'],
  location: RouteComponentProps['location'],
}

const ActionButtons = ({
  isUserLoggedIn,
  userHasAccessToDownload,
  discoveryConfig,
  resourceInfo,
  missingRequiredIdentityProviders,
  noData,
  downloadStatus,
  setDownloadStatus,
  history,
  location,
}: ActionButtonsProps): JSX.Element => {
  const { HandleRedirectFromDiscoveryDetailsToLoginClick } = UseHandleRedirectToLoginClickNonResumable();

  const studyMetadataFieldNameReference: string | undefined = discoveryConfig?.features.exportToWorkspace.studyMetadataFieldName;
  const manifestFieldName: string = discoveryConfig?.features.exportToWorkspace.manifestFieldName || '';
  const enableExportFullMetadata: boolean = Boolean(discoveryConfig?.features.exportToWorkspace);
  const { fileManifest, externalFileMetadata } = assembleFileMetadata(manifestFieldName, [resourceInfo]);

  // Study level meta button should show only if the downloading study level metadata value is enabled
  // and resourceInfo includes the study metadata field name reference from the discovery config
  const showDownloadStudyLevelMetadataButton = Boolean(
    discoveryConfig?.features.exportToWorkspace.enableDownloadStudyMetadata
      && studyMetadataFieldNameReference
      && resourceInfo?.[studyMetadataFieldNameReference],
  );
  const showDownloadFileManifestButtons = Boolean(
    discoveryConfig?.features.exportToWorkspace.enableDownloadManifest,
  );
  const showDownloadAllFilesButtons = Boolean(
    discoveryConfig?.features.exportToWorkspace.enableDownloadZip,
  );
  const verifyExternalLoginsNeeded = Boolean(
    discoveryConfig?.features.exportToWorkspace.verifyExternalLogins,
  );
  const showDownloadVariableMetadataButton = Boolean(
    discoveryConfig.features.exportToWorkspace.variableMetadataFieldName
      && discoveryConfig.features.exportToWorkspace.enableDownloadVariableMetadata,
  );
  const defaultVariableMetadataInfo = {
    noVariableLevelMetadata: true,
    variableLevelMetadataRecords: {} as VariableLevelMetadata,
  };
  const [variableMetadataInfo, setVariableMetadataInfo] = useState(defaultVariableMetadataInfo);

  let uid = '';
  if (resourceInfo) {
    uid = resourceInfo[discoveryConfig.minimalFieldMapping.uid] || '';
  }

  useEffect(() => {
    DownloadVariableMetadataInfo(
      discoveryConfig,
      resourceInfo,
      showDownloadVariableMetadataButton,
      setVariableMetadataInfo,
    );
    // reset variableMetadataInfo on unmount:
    return setVariableMetadataInfo(defaultVariableMetadataInfo);
  }, [resourceInfo]);

  const ConditionalPopover = ({ children }) => {
    if (noData) {
      return (
        <Popover content={'The file is not available for the selected study'}>
          {children}
        </Popover>
      );
    }
    if (!userHasAccessToDownload) {
      return (
        <Popover content={'You don\'t have access to this data'}>
          {children}
        </Popover>
      );
    }
    if (missingRequiredIdentityProviders.length) {
      const onlyInCommonMsg = missingRequiredIdentityProviders.length > 1 ? `Data selection requires [${missingRequiredIdentityProviders.join(', ')}] credentials to access. Please change selection to only need one set of credentials and log in using appropriate credentials`
        : `This dataset is only accessible to users who have authenticated via ${missingRequiredIdentityProviders}. Please log in using the ${missingRequiredIdentityProviders} option.`;
      return (
        <Popover
          className='discovery-detail-popover'
          arrowPointAtCenter
          overlayInnerStyle={{ maxWidth: '300px' }}
          content={(
            <React.Fragment>
              {onlyInCommonMsg}
            </React.Fragment>
          )}
        >
          {children}
        </Popover>
      );
    }
    return children;
  };

  const checkIfDownloadAllFilesButtonDisabled = () => {
    // if (noData) return true;
    const downloadInProgress = downloadStatus.inProgress;
    if (downloadInProgress) return true;
    if (!resourceInfo) return true;
    let isExternalFileManifestMissing = true;
    if (enableExportFullMetadata) {
      isExternalFileManifestMissing = !resourceInfo.external_file_metadata || resourceInfo.external_file_metadata.length === 0;
    }
    const eachSelectedResourcesIsMissingManifest = isManifestDataMissing(resourceInfo, manifestFieldName) && isExternalFileManifestMissing;
    if (eachSelectedResourcesIsMissingManifest) return true;
    return false;
  };

  const isHEALLoginNeeded = Boolean(missingRequiredIdentityProviders.length);
  const downloadManifestButtonText = discoveryConfig.features?.exportToWorkspace?.downloadManifestButtonText || 'Download Manifest';
  return (
    <div className='discovery-modal_buttons-row' data-testid='actionButtons'>
      <Row
        className='row'
        justify='space-between'
        gutter={[8, 8]}
      >
        {showDownloadVariableMetadataButton && (
          <Col>
            <Button
              className='discovery-action-bar-button'
              data-testid='download-variable-level-metadata'
              disabled={Boolean(
                downloadStatus.inProgress
                  || variableMetadataInfo.noVariableLevelMetadata,
              )}
              loading={downloadStatus.inProgress === 'DownloadVariableMetadata'}
              onClick={() => {
                DownloadVariableMetadata(
                  variableMetadataInfo.variableLevelMetadataRecords,
                  resourceInfo,
                  setDownloadStatus,
                );
              }}
            >
              Download <br />
              Variable-Level Metadata
            </Button>
          </Col>
        )}
        {showDownloadStudyLevelMetadataButton && (
          <Col>
            <Button
              className='discovery-action-bar-button'
              data-testid='download-study-level-metadata'
              disabled={Boolean(downloadStatus.inProgress)}
              onClick={() => DownloadJsonFile(
                'study-level-metadata',
                studyMetadataFieldNameReference
                      && resourceInfo[studyMetadataFieldNameReference],
              )}
            >
                Download <br />
                Study-Level Metadata
            </Button>
          </Col>
        )}
        {showDownloadFileManifestButtons && (
          <Col>
            {isUserLoggedIn && !isHEALLoginNeeded && (
              <ConditionalPopover>
                <Button
                  className='discovery-action-bar-button'
                  data-testid='download-manifest'
                  disabled={Boolean(isManifestDataMissing(resourceInfo, manifestFieldName) || noData
                    || downloadStatus.inProgress || !userHasAccessToDownload)}
                  onClick={() => {
                    HandleDownloadManifestClick(
                      discoveryConfig,
                      [resourceInfo],
                      missingRequiredIdentityProviders,
                    );
                  }}
                >
                  {downloadManifestButtonText}
                </Button>
              </ConditionalPopover>
            )}
            {(!isUserLoggedIn || isHEALLoginNeeded) && (
              <ConditionalPopover>
                <Button
                  className='discovery-action-bar-button'
                  data-testid='login-to-download-manifest'
                  disabled={Boolean(noData || downloadStatus.inProgress)}
                  onClick={() => {
                    HandleRedirectFromDiscoveryDetailsToLoginClick(uid);
                  }}
                >
                Login to
                  <br /> {downloadManifestButtonText}
                </Button>
              </ConditionalPopover>
            )}
          </Col>
        )}
        {showDownloadAllFilesButtons && (
          <Col>
            {isUserLoggedIn && !isHEALLoginNeeded && (
              <ConditionalPopover>
                <Button
                  className='discovery-action-bar-button'
                  data-testid='download-all-files'
                  disabled={Boolean(checkIfDownloadAllFilesButtonDisabled() || !userHasAccessToDownload)}
                  loading={downloadStatus.inProgress === 'DownloadDataFiles'}
                  onClick={() => DownloadDataFiles(
                    downloadStatus,
                    setDownloadStatus,
                    history,
                    location,
                    missingRequiredIdentityProviders,
                    verifyExternalLoginsNeeded,
                    fileManifest,
                    externalFileMetadata,
                  )}
                >
                  Download All Files
                </Button>
              </ConditionalPopover>
            )}
            {(!isUserLoggedIn || isHEALLoginNeeded) && (
              <ConditionalPopover>
                <Button
                  className='discovery-action-bar-button'
                  data-testid='login-to-download-all-files'
                  disabled={Boolean(noData || downloadStatus.inProgress)}
                  onClick={() => {
                    HandleRedirectFromDiscoveryDetailsToLoginClick(uid);
                  }}
                >
                Login to
                  <br /> Download All Files
                </Button>
              </ConditionalPopover>
            )}
          </Col>
        )}
      </Row>
    </div>
  );
};
export default ActionButtons;
