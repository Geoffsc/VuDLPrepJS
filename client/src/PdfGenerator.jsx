import React from "react";
import AjaxHelper from "./AjaxHelper";

export default function PdfGenerator() {
    function doApiCall(method) {
        const ajax = AjaxHelper.getInstance();
        const pid = document.getElementById("pdfGeneratePid").value;
        const url = ajax.url + "/messenger/pdfgenerator/" + encodeURIComponent(pid);
        ajax.ajax({
            method: method,
            url: url,
            dataType: "text",
            error: function (result, status) {
                document.getElementById("pdfGenerateResults").innerHTML = status;
            },
            success: function (result) {
                document.getElementById("pdfGenerateResults").innerHTML = result;
            },
        });
    }

    function generate() {
        doApiCall("POST");
    }

    return (
        <div>
            <h1>PDF Generator Tool</h1>
            <label>
                PID: <input type="text" id="pdfGeneratePid" />
            </label>
            <button onClick={generate}>Generate</button>
            <h2>Results:</h2>
            <pre id="pdfGenerateResults"></pre>
        </div>
    );
}
