import React from "react";
import { Link } from "react-router-dom";
import PropTypes from "prop-types";

import ChildList from "./ChildList";

import "remixicon/fonts/remixicon.css";

class ChildListItem extends React.Component {
    static propTypes = {
        pid: PropTypes.string,
        title: PropTypes.string,
        openMetadataEditor: PropTypes.func,
    };

    constructor(props) {
        super(props);
        this.state = { open: false };
        this.toggle = this.toggle.bind(this);
    }

    toggle(e) {
        e.preventDefault();
        e.stopPropagation();
        this.setState({ open: !this.state.open });
    }

    render() {
        return (
            <div className="editor__child-list-item">
                <div className="editor__list-item-metadata">
                    <button className="editor__child-toggle" onClick={this.toggle}>
                        {this.state.open ? (
                            <i className="ri-checkbox-indeterminate-line"></i>
                        ) : (
                            <i className="ri-add-box-fill"></i>
                        )}
                    </button>{" "}
                    <button className="editor__gear-btn" onClick={() => this.props.openMetadataEditor(this.props.pid)}>
                        <i className="ri-folder-5-fill"></i>
                        <i className="ri-settings-5-fill"></i>
                    </button>
                    <Link to={`/editor/object/${this.props.pid}`} className="editor__child-title">
                        {this.props.title}
                    </Link>
                    <div className="editor__list-item-status">TODO: status</div>
                </div>
                {this.state.open && (
                    <ChildList parent={this.props.pid} openMetadataEditor={this.props.openMetadataEditor} />
                )}
            </div>
        );
    }
}

export default ChildListItem;
