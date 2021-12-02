import React, {Fragment} from 'react';
import {TextBuffer} from 'atom';

import Octicon from '../atom/octicon';
import AtomTextEditor from '../atom/atom-text-editor';
import Select from 'react-select';

const owners = [
  {
    name: 'smashwilson',
    url: 'https://avatars2.githubusercontent.com/u/17565?s=24&v=4',
  },
  {
    name: 'ansible',
    url: 'https://avatars1.githubusercontent.com/u/1507452?s=24&v=4',
    disabled: true,
  },
  {
    name: 'atom',
    url: 'https://avatars2.githubusercontent.com/u/1089146?s=24&v=4',
  },
  {
    name: 'electron',
    url: 'https://avatars3.githubusercontent.com/u/13409222?s=24&v=4',
  },
];

export default class PublishDialog extends React.Component {
  constructor(props) {
    super(props);

    this.nameBuffer = new TextBuffer({text: 'shhh'});
    this.localPathBuffer = new TextBuffer({text: '/home/smash/src/shhh'});
    this.sourceRemoteBuffer = new TextBuffer({text: 'origin'});

    this.state = {selectedOwner: owners[0]};
  }

  render() {
    return (
      <form className="github-Dialog github-Publish modal padded">
        <h1 className="github-Publish-header">
          <Octicon icon="globe" />
          Publish GitHub repository
        </h1>
        <div className="github-Publish-repo block">
          <Select
            className="github-Publish-owner"
            clearable={false}
            options={owners}
            optionRenderer={this.renderOwner}
            value={this.state.selectedOwner}
            valueRenderer={this.renderOwner}
            onChange={this.setOwner}
          />
          /
          <AtomTextEditor className="github-Publish-name" mini={true} buffer={this.nameBuffer} />
        </div>
        <div className="github-Publish-visibility block">
          <span className="github-Publish-visibilityHeading">Visibility:</span>
          <label className="github-Publish-visibilityOption input-label">
            <input className="input-radio" type="radio" name="visibility" defaultChecked={true} />
            <Octicon icon="globe" />

            Public
          </label>
          <label className="github-Publish-visibilityOption input-label">
            <input className="input-radio" type="radio" name="visibility" />
            <Octicon icon="mirror-private" />

            Private
          </label>
        </div>
        <div className="github-Publish-localPath block">
          <label className="input-label">
            <p>Local path:</p>
            <div className="github-Publish-localPathRow">
              <AtomTextEditor
                className="github-Publish-localPath"
                mini={true}
                readOnly={true}
                buffer={this.localPathBuffer}
              />
              <button className="btn icon icon-file-directory" disabled />
            </div>
          </label>
        </div>
        <details className="github-Clone-advanced block">
          <summary>Advanced</summary>
          <main>
            <div className="github-Clone-protocol block">
              <span className="github-Clone-protocolHeading">Protocol:</span>
              <label className="github-Clone-protocolOption input-label">
                <input className="input-radio" type="radio" name="protocol" defaultChecked={true} />
                HTTPS
              </label>
              <label className="github-Clone-protocolOption input-label">
                <input className="input-radio" type="radio" name="protocol" />
                SSH
              </label>
            </div>
            <div className="github-Clone-sourceRemote block">
              <label htmlFor="github-Clone-sourceRemoteName">Source remote name:</label>
              <AtomTextEditor
                className="github-Clone-sourceRemoteName"
                id="github-Clone-sourceRemoteName"
                mini={true}
                autoWidth={false}
                buffer={this.sourceRemoteBuffer}
              />
            </div>
          </main>
        </details>
        <hr />
        <p className="github-Publish-actions">
          <button className="btn inline-block-tight">Cancel</button>
          <button className="btn btn-primary inline-block-tight">Publish</button>
        </p>
      </form>
    );
  }

  setOwner = v => this.setState({selectedOwner: v})

  renderOwner = ({name, url, disabled}) => {
    return (
      <Fragment>
        <img alt="" src={url} className="github-Publish-owner-optionImage" />
        {name}
        {disabled && <br />}
        {disabled && '(insufficient permissions)'}
      </Fragment>
    );
  }
}
