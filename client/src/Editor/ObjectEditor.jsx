import React from "react";
import PropTypes from "prop-types";

import AjaxHelper from "../AjaxHelper";
import ChildList from "./ChildList";
import MetadataEditor from "./MetadataEditor";
import Modal from "./Modal";

import "../css/editor.css";

class ObjectEditor extends React.Component {
    static propTypes = {
        pid: PropTypes.string,
    };

    constructor(props) {
        super(props);
        this.ajax = AjaxHelper.getInstance();
        this.state = { modal: null };
        // TODO: Get details
        this.openMetadataEditor = this.openMetadataEditor.bind(this);
        this.closeModal = this.closeModal.bind(this);
    }

    openMetadataEditor(pid) {
        this.setState({
            modal: <MetadataEditor pid={pid} />,
            modalTitle: "Metadata for " + pid,
        });
        this.render();
    }

    closeModal() {
        this.setState({ modal: null });
    }

    render() {
        return (
            <div>
                <h1>{this.props.pid}</h1>
                <ChildList parentID={this.props.pid} openMetadataEditor={this.openMetadataEditor} />

                <Modal title={this.state.modalTitle ?? ""} open={this.state.modal != null} closeModal={this.closeModal}>
                    {this.state.modal ?? ""}
                </Modal>
            </div>
        );
    }
}

export default ObjectEditor;
