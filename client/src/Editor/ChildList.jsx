import React from "react";
import PropTypes from "prop-types";

import AjaxHelper from "../AjaxHelper";
import ChildListItem from "./ChildListItem";

class ChildList extends React.Component {
    static propTypes = {
        parentID: PropTypes.string,
        openMetadataEditor: PropTypes.func,
    };

    constructor(props) {
        super(props);
        this.ajax = AjaxHelper.getInstance();
        this.state = { children: [] };
    }

    componentDidMount() {
        // TODO: Get real data
        Promise.resolve([
            { pid: "vudl:2", title: "Holding Area" },
            { pid: "vudl:3", title: "Villanova Digital Library" },
        ]).then((children) => {
            this.setState({ children });
        });
    }

    render() {
        return (
            <div className="editor__child-list">
                <div className="editor__child-list-pages">Page 1 of TODO</div>
                {this.state.children.map((child) => (
                    <ChildListItem key={child.pid} {...child} openMetadataEditor={this.props.openMetadataEditor} />
                ))}
            </div>
        );
    }
}

export default ChildList;
