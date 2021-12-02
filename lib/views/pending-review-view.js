import React, {Fragment} from 'react';
import PropTypes from 'prop-types';
import AtomTextEditor from '../atom/atom-text-editor';
import RefHolder from '../models/ref-holder';

export default class PendingReviewView extends React.Component {

  static propTypes = {
    renderReviewCommentThread: PropTypes.func.isRequired,
    reviewTypesByAction: PropTypes.object.isRequired,
  };

  constructor(props) {
    super();
    this.summaryHolder = new RefHolder();
    this.state = {reviewType: {icon: '', description: ''}};
  }

  render() {
    return (
      <div className="github-Reviews github-PendingReviews">
        {this.renderSummarySection()}
        {this.renderCommentSection()}
      </div>
    );
  }

  onReviewTypeSelected = event => {
    this.setState({reviewType: this.props.reviewTypesByAction.get(event.target.value)});
  }

  renderSummarySection() {
    const {icon, description} = this.state.reviewType;
    return (
      <details open className="github-Reviews-section summaries">
        <summary className="github-Reviews-header">
          <span className="github-Reviews-title">Summary</span>
        </summary>
        <main className="github-Reviews-container">
          <div className="github-PendingReviews-editor">
            <span className={`github-ReviewSummary-icon icon ${icon}`} title={description} />
            <AtomTextEditor
              placeholderText="Leave a comment"
              lineNumberGutterVisible={false}
              softWrapped={true}
              autoHeight={true}
              readOnly={false}
              refModel={this.summaryHolder}
            />
          </div>
          <div className="github-PendingReviews-summaryFooter">
            <div className="github-PendingReviews-reviewType">
              <select
                className="input-select"
                value={this.state.reviewType ? this.state.reviewType.action : ''}
                onChange={this.onReviewTypeSelected}>
                <option disabled value="">Review Type</option>
                {['COMMENT', 'APPROVE', 'REQUEST_CHANGES'].map(action => {
                  const {label} = this.props.reviewTypesByAction.get(action);
                  return (<option value={action} key={action}>{label}</option>);
                })}
              </select>
            </div>
            <div className="github-PendingReviews-buttonGroup">
              <button className="btn">Discard Review</button>
              <button className="btn btn-primary">Submit review</button>
            </div>
          </div>
        </main>
      </details>
    );
  }

  renderCommentSection() {
    const threads = this.props.pendingCommentThreads;
    return (
      <details open className="github-Reviews-section comments">
        <summary className="github-Reviews-header">
          <span className="github-Reviews-title">Comments</span>
        </summary>
        {threads.length > 0 && <main className="github-Reviews-container">
          {threads.map(this.props.renderReviewCommentThread)}
        </main>}
      </details>
    )
  }

}
