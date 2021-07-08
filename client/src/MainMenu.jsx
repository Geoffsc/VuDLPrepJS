import React from "react";
import { Link } from "react-router-dom";

export default function MainMenu() {
    return (
        <div>
            <h1>VuDL Admin</h1>
            <h2>Core Functions</h2>
            <ul>
                <li>
                    <Link to="/paginate">Job Paginator</Link>
                </li>
                <li>Object Editor [coming soon]</li>
            </ul>
            <h2>Other Tools</h2>
            <ul>
                <li>
                    <Link to="/pdf">PDF Generator</Link>
                </li>
                <li>
                    <Link to="/solr">Solr Indexer</Link>
                </li>
            </ul>
        </div>
    );
}
