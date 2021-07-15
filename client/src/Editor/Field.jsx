import React from "react";
import PropTypes from "prop-types";

class Field extends React.Component {
    static propTypes = {
        value: PropTypes.string,
        type: PropTypes.string,
        index: PropTypes.number,
        editField: PropTypes.func,
        removeField: PropTypes.func,
    };

    constructor(props) {
        super(props);
    }

    render() {
        return (
            <li className="field flex">
                <div className="flex-1 field__values">{this.props.value}</div>
                <button
                    className="field__remove flex-none btn--none"
                    onClick={() => this.props.editField(this.props.index)}
                >
                    <i className="ri-edit-line"></i>
                </button>
                <button
                    className="field__remove flex-none btn--none"
                    onClick={() => this.props.removeField(this.props.index)}
                >
                    <i className="ri-delete-bin-2-line"></i>
                </button>
            </li>
        );
    }
}

export default Field;
