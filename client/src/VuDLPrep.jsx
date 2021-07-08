import React from "react";
import { BrowserRouter, Switch, Route, useParams } from "react-router-dom";
import PropTypes from "prop-types";

import AjaxHelper from "./AjaxHelper";
import JobSelector from "./JobSelector";
import JobPaginator from "./JobPaginator";
import LogoutButton from "./LogoutButton";
import MainMenu from "./MainMenu";
import PdfGenerator from "./PdfGenerator";
import SolrIndexer from "./SolrIndexer";

class VuDLPrep extends React.Component {
    constructor(props) {
        super(props);
        this.ajax = AjaxHelper.getInstance();
    }

    render() {
        return (
            <div>
                <div className="logout">
                    <LogoutButton />
                </div>
                <BrowserRouter>
                    <Switch>
                        <Route exact path="/">
                            <MainMenu />
                        </Route>
                        <Route exact path="/paginate">
                            <JobSelector
                                app={this}
                                ref={(s) => {
                                    this.selector = s;
                                }}
                            />
                        </Route>
                        <Route path="/paginate/:category/:job">
                            <JobPaginatorHook />
                        </Route>
                        <Route exact path="/pdf">
                            <PdfGenerator />
                        </Route>
                        <Route exact path="/solr">
                            <SolrIndexer />
                        </Route>
                    </Switch>
                </BrowserRouter>
            </div>
        );
    }
}

function JobPaginatorHook() {
    let { category, job } = useParams();
    return <JobPaginator category={category} job={job} />;
}

VuDLPrep.propTypes = {
    logoutUrl: PropTypes.string,
    token: PropTypes.string,
};

export default VuDLPrep;
