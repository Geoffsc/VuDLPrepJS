import React from "react";
import PropTypes from "prop-types";

import Field from "./Field";

class FieldList extends React.Component {
    static propTypes = {
        index: PropTypes.number,
        title: PropTypes.string,
        type: PropTypes.string,
        values: PropTypes.arrayOf(PropTypes.string),
        editField: PropTypes.func,
        removeField: PropTypes.func,
    };

    constructor(props) {
        super(props);
        this.editField = this.editField.bind(this);
        this.removeField = this.removeField.bind(this);
    }

    editField(itemIndex) {
        this.props.editField(this.props.index, itemIndex);
    }

    removeField(itemIndex) {
        this.props.removeField(this.props.index, itemIndex);
    }

    render() {
        return (
            <div className="field-list">
                <h3>{this.props.title}</h3>
                {this.props.values.map((field, i) => (
                    <Field
                        key={"field" + i}
                        value={field}
                        index={i}
                        editField={this.editField}
                        removeField={this.removeField}
                    />
                ))}
            </div>
        );
    }
}

export default FieldList;
