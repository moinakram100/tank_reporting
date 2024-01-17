/*global QUnit*/

sap.ui.define([
	"tank-reporting/controller/View1.controller"
], function (Controller) {
	"use strict";

	/* global QUnit, sap */

/* global QUnit, sap, sinon */

QUnit.module("Enter Dip Functionality", {
    beforeEach: function () {
        this.controller = new sap.ui.controller("tank-reporting.controller.View1");
        this.modelStub = sinon.stub(this.controller.getOwnerComponent(), "getModel");
        this.createStub = sinon.stub();

        // Replace the actual OData model with a stub
        this.modelStub.withArgs("tanks").returns({
            create: this.createStub
        });

        // You might need to set up other stubs or dependencies here
    },
    afterEach: function () {
        // Cleanup code after each test
        this.modelStub.restore();
    }
});

QUnit.test("Submitting Dip Form", function (assert) {
    // Arrange
    var done = assert.async();
    var oController = this.controller;

    // Mock the form data
    var formData = {
        SocEvent: "SampleSocEvent",
        TotalheightFltp: "SampleTotalheightFltp",
        TestTemp: "SampleTestTemp",
        MatTemp: "SampleMatTemp",
        TestDens: "SampleTestDens"
    };

    // Set the form data in the model
    oController.getView().getModel("formData").setData(formData);

    // Act
    oController.onSubmitPress();

    // Assert
    assert.expect(1); // Set the number of assertions expected in this test

    // Check if the create method was called with the correct payload
    assert.ok(this.createStub.calledWith("/CreateDipSet", sinon.match(formData)), "create method was called with the correct payload");

    // Handle asynchronous operations, if any
    setTimeout(function () {
        done(); // Tell QUnit that the async test has completed
    }, 1000); // Adjust the timeout value based on your application's behavior
});


});
