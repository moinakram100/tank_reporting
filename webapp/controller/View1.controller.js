sap.ui.define(
  [
    "sap/ui/core/mvc/Controller",
    "sap/m/Dialog",
    "sap/m/Button",
    "sap/ui/model/json/JSONModel",
    "sap/ui/model/Filter",
    "sap/ui/core/Fragment",
    "sap/ui/model/FilterOperator",
    "sap/ui/model/odata/v2/ODataModel",
    "sap/m/MessageBox",
    "sap/m/MessageToast",
    "sap/m/Popover",
    "sap/m/Text"
  ],
  function ( Controller,Dialog,Button,JSONModel,Filter,Fragment,FilterOperator,ODataModel,MessageBox,MessageToast,Popover,Text){
    "use strict";
  var updateStatus,updateLocation,selectedMaterial, latestTankDataMap = {};

    return Controller.extend("tankreporting.controller.View1", {
      _oTankInfoDialog: null,
      _oDialog:null,
      oFragment:null,

    onInit: function () {
      var oModel = this.getOwnerComponent().getModel("tanks");

      var oTankLevel = this.getView().byId("container");

      // var oButton = this.byId("_IDGenButton1");
      // oButton.addEventDelegate({
      //   onmouseover: this.onButtonHover.bind(this)
      // });

      var createModel = new JSONModel({
        Counter:"",
        DipDate:"",
        DipTime:"",
        SocEvent:"",
        TestTemp : "",
        MatTemp:"",
        TestDens:"",
        TotalheightFltp:""
      })
      this.getView().setModel(createModel,"formData");
      
      if (oModel) {
          var that = this;
  
          // Read Tank_MasterSet
          var tankPromise = new Promise(function (resolve, reject) {
              oModel.read("/Tank_MasterSet", {
                  success: function (oData) {
                      if(Array.isArray(oData.results)){
                        console.table(oData.results)
                      }
                      that._tankData = oData.results;
                      resolve();
                  },
                  error: function (oError) {
                      console.error("Error reading Tank_MasterSet:", oError);
                      reject(oError);
                  }
              });
          });
        
  
          // Read Stock_DipSet
          var stockDipPromise = new Promise(function (resolve, reject) {
              oModel.read("/Stock_DipSet", {
                  success: function (oData) {
                    if(Array.isArray(oData.results)){
                      console.table(oData.results)
                    }
                      that.stockDipData = oData.results;
                      resolve();
                  },
                  error: function (error) {
                      console.error("Error reading Stock_DipSet:", error);
                      reject(error);
                  }
              });
          });

         // Read soc_eventSet
          var SocEventPromise = new Promise(function (resolve, reject) {
            oModel.read("/Soc_eventSet", {
                success: function (data) {
                    //  console.log("SocEvent Data loaded successfully:", data.results);
                    that.SocEventSet = data.results;
                    resolve();
                },
                error: function (error) {
                    console.error("Error reading Stock_DipSet:", error);
                    reject(error);
                }
            });
        });

         // Read system statusset
          var SystemStatusPromise = new Promise(function (resolve, reject) {
            oModel.read("/ZTank_SValueHelp", {
                success: function (data) {
                    //  console.log("systemStatus Data loaded successfully:", data);
                    that.systemStatus = data.results;
                    resolve();
                },
                error: function (error) {
                    console.error("Error reading Stock_DipSet:", error);
                    reject(error);
                }
            });
        });

      var tankProductPromise = new Promise(function (resolve, reject) {
        oModel.read("/ZTANK_PRODUCT_GROUPS", {
            success: function (data) {
                var uniqueProductGroups = [];
                var productMap = {};
        console.log("product result read",data.results);
                // Iterate through the results to find unique product groups
                data.results.forEach(function (item) {
                    var productGroup = item.ProductGroup;
                    var material = item.MaterialCode;
    
                    if (!productMap[productGroup]) {
                        productMap[productGroup] = true;
                        uniqueProductGroups.push({
                            ProductGroup: productGroup,
                            MaterialCode: [material] 
                        });
                    } else {
                        // If product group already exists, add material to its list
                        uniqueProductGroups.forEach(function (group) {
                            if (group.ProductGroup === productGroup) {
                                group.MaterialCode.push(material);
                            }
                        });
                    }
                });
          console.log("is data in array",uniqueProductGroups);
                // Set the unique product groups to the view model
                that.tankProduct = uniqueProductGroups;
                resolve();
            },
            error: function (error) {
                console.error("Error reading tank Product:", error);
                reject(error);
            }
        });
    });
    

        // Read Tank master table
        var zTankMasterPromise = new Promise(function(resolve,reject){
          oModel.read("/ZMaster_tank",{
            success:function(data){
              console.log("master data loaded:",data);
              if(Array.isArray(data.results)){
                console.table(data.results)
              }
              that.masterSetData = data.results
              resolve();

            },
            error:function(error){
              console.error("Error loading Tank master:",error);
              reject(error)
            }
          })
        }) 

          var locationPromise = new Promise(function (resolve, reject) {
            oModel.read("/ZTank_LocValueHelp", {
                success: function (data) {
                    //  console.log("system Location Data loaded successfully:", data);
                    that.location = data.results;
                    resolve();
                },
                error: function (error) {
                    console.error("Error reading Stock_DipSet:", error);
                    reject(error);
                }
            });
        });
  
        Promise.all([tankPromise, stockDipPromise,SocEventPromise,SystemStatusPromise,locationPromise,zTankMasterPromise,tankProductPromise]).then(function () {

           var tankData = that.masterSetData;
          //  var latestTankDataMap = {};
           var totalQuantity = 0;
           
           tankData.forEach(function(tank) {
                var socnr = tank.Socnr;
                var Etmstm = new Date(tank.Shorted);
               if (!latestTankDataMap[socnr] || latestTankDataMap[socnr].Shorted < Etmstm) {
               latestTankDataMap[socnr] = tank;
        }
      });
      Object.values(latestTankDataMap).forEach(function(tank) {
        var quantity = parseFloat(tank.QuanSku); 
        if (!isNaN(quantity)) {
          totalQuantity += quantity;
          } else {
          console.error('Invalid quantity:', tank.QuanSku); 
         }
       });
     
       totalQuantity = parseFloat(totalQuantity.toFixed(2))+"L";
        var fullTankModel = new JSONModel({
        tankData: Object.values(latestTankDataMap),
        status : that.systemStatus,
        product : that.tankProduct,
        totalQuantity: totalQuantity
        });
          that.getView().setModel(fullTankModel, "tanks");
            // console.log("fullTankModel is"+JSON.stringify(that.getView().getModel("tanks").getData()));
          that.onDataLoaded();
          that.onPercentage()
        }).catch(function (error) {
              console.error("Failed to load data:", error);
          });
      } else {
          console.error("Failed to load model 'tanks'.");
      }
  },

  onChange: function (oEvent) {
    var oSelect = oEvent.getSource();
    var selectedItem = oSelect.getSelectedItem();
    var selectedText = selectedItem ? selectedItem.getText() : "";
    oSelect.setPlaceholder(selectedText);
  },

// change handle code for datepicker
selectDate:function(oEvent){
  var oDateTimePicker = oEvent.getSource();
    var dipDate = oDateTimePicker.getDateValue();

    if (dipDate) {
        var formattedDate = this.formatDate(dipDate); 
        var formattedTime = this.formatTime(dipDate);
        // Concatenate formatted date with "T00:00:00"
        var combinedDateTimeString = formattedDate + "T00:00:00";
        var combinedTimeString = formattedTime;
         console.log("formattedTime",combinedTimeString);
   
        var formDataModel = this.getView().getModel("formData");
        formDataModel.setProperty("/DipDate", combinedDateTimeString); 
        formDataModel.setProperty("/DipTime", combinedTimeString); 
    } else {
        console.error("Invalid Date");
    }
},

formatDate: function (date) {
  return sap.ui.core.format.DateFormat.getDateInstance({ pattern: "yyyy-MM-dd" }).format(date);
},

formatTime: function (date) {
  var inputTime = sap.ui.core.format.DateFormat.getTimeInstance({ pattern: "HH:mm:ss" }).format(date);
  const [hours, minutes, seconds] = inputTime.split(':');

    // Create the ISO 8601 duration string
    const isoDuration = `PT${hours}H${minutes}M${seconds}S`;
    console.log("Time is ", isoDuration);
    return isoDuration;
},



// change label based on selected item in enter dip form
  onDipType:function(oEvent) {
    // debugger;
    var selectedKey = oEvent.getSource().getSelectedKey();
    var selectedText = oEvent.getSource().getSelectedItem().getText();
    console.log("selected item is"+selectedText);
    var labelMap = {
      "Opening dip Height entry": "Material Height:",
      "Closing dip Height entry": "Material Height:",
     };
    var oLabel = sap.ui.getCore().byId("_IDGenLabel2");
    oLabel.setText(labelMap[selectedText] || "Material Volume:");
    var formDataModel = this.getView().getModel("formData");
    formDataModel.setProperty("/SocEvent", selectedKey);
  },

  // onButtonHover: function(oEvent) {
  //   var oButton = oEvent.srcControl;
  //   var sTankInfo = this.getTankInfo(oButton);
  //   if (!this._oPopover) {
  //     this._oPopover = new Popover({
  //       placement: sap.m.PlacementType.Bottom,
  //       title: "Tank Information",
  //     });
  //     this.getView().addDependent(this._oPopover);
  //   }
  //   this._oPopover.removeAllContent();
  //   this._oPopover.addContent(new Text({ text: sTankInfo }));
  //   this._oPopover.openBy(oButton);
  // },

  // getTankInfo: function(oButton) {
  //   var oContext = oButton.getBindingContext("tanks");
  //   // var sSocnr = oContext.getProperty("Socnr");
  //   var sLgort = oContext.getProperty("Lgort");
  //   var sQuanLvc = oContext.getProperty("QuanSku");
  //   // Format tank information as needed
  //   var sTankInfo = "Tank Number: " + 2 + "\nLocation: " + sLgort + "\nLiquid Level: " + sQuanLvc;

  //   return sTankInfo;
  // },


  // product filter code 
  onProductFilter:function(oEvent){
    var oValidatedComboBox = oEvent.getSource(),
       sSelectedKey = oValidatedComboBox.getSelectedKey(),
       selectedMaterial = oValidatedComboBox.getValue();
       var productValue = this.getView().byId("filterDropdown3")
       productValue.setValue("")

       var oMaterialsModel = this.getView().getModel("tanks");
       var aFilteredProduct = oMaterialsModel.getProperty("/product").filter(function(product) {
           return product.ProductGroup === selectedMaterial;
       });
      //  debugger;
      // console.log("sdfghj",aFilteredProduct);
       var extractedProperties = aFilteredProduct.map(function(product) {
        return {
            Material: product.MaterialCode,
        };
    });
       var mModel = new JSONModel(extractedProperties[0].Material)
       this.getView().setModel(mModel,"materialFilter")
       console.log("product filter is", this.getView().getModel("materialFilter").getData());

  },
  

 
// on filter with Material code through change handler on combobox
  onMterialFilter:function(oEvent){
       var oValidatedComboBox = oEvent.getSource(),
				sSelectedKey = oValidatedComboBox.getSelectedKey(),
				selectedMaterial = oValidatedComboBox.getValue();
        console.log("material no is",selectedMaterial,latestTankDataMap);

        var latestTankDataArray = Object.values(latestTankDataMap);
        var filterTankMatnr = latestTankDataArray.filter(function(tank) {
         return tank.Matnr === selectedMaterial;
       });

       var oFlexBox = this.getView().byId("tank_layout");
       var oModel = new JSONModel({
        tankData: filterTankMatnr
      });
    oFlexBox.setModel(oModel, "tanks");
       console.log("selected matnr tank is",filterTankMatnr);
  },

  onFilterRefreshPressed:function(){
    this.showAllTanks();
  },

  

// Go filter Button code 
onFilterGoPressed: function() {
  var productItem = this.byId("filterDropdown2").getValue();
  var materialItem = this.byId("filterDropdown3").getValue();

  if (!productItem || !materialItem) {
      MessageBox.error("Please Select Product and Material");
  } else {
      var selectedItem = this.byId("filterDropdown3");
      var selectedMatnr = selectedItem.getValue();

      var latestTankDataArray = Object.values(latestTankDataMap);
      var filterTankMatnr = latestTankDataArray.filter(function(tank) {
          return tank.Matnr === selectedMatnr;
      });

      if (filterTankMatnr.length === 0) {
          var that = this;
          MessageBox.error(`No tanks found for selected material number: ${selectedMatnr}`, {
              onClose: function(oAction) {
                  if (oAction === MessageBox.Action.CLOSE) {
                      that.showAllTanks(); // Call function to show all tanks
                  }
              }
          });
          return;
      }

      var totalQuantity = filterTankMatnr.reduce(function(total, tank) {
          return total + parseFloat(tank.QuanSku || 0);
      }, 0);
      console.log("quantity is ", totalQuantity);

      var oFlexBox = this.getView().byId("tank_layout");
      var oModel = new JSONModel({
          tankData: filterTankMatnr,
          totalQuantity: totalQuantity
      });
      oFlexBox.setModel(oModel, "tanks");

      var totalQuantityText = this.byId("total_calculated");
      totalQuantityText.setText(totalQuantity.toString());
  }
},

showAllTanks: function() {
  var latestTankDataArray = Object.values(latestTankDataMap);
  var totalQuantity = latestTankDataArray.reduce(function(total, tank) {
      return total + parseFloat(tank.QuanSku || 0);
  }, 0);

  var oFlexBox = this.getView().byId("tank_layout");
  var oModel = new JSONModel({
      tankData: latestTankDataArray,
      totalQuantity: totalQuantity
  });
  oFlexBox.setModel(oModel, "tanks");

  var totalQuantityText = this.byId("total_calculated");
  totalQuantityText.setText(totalQuantity.toString());

  var filterDropdown1 = this.byId("filterDropdown2");
var filterDropdown2 = this.byId("filterDropdown3");
if (filterDropdown1 || filterDropdown2) {
    filterDropdown1.setValue("");
    filterDropdown2.setValue("");
} 
},



 // Submit dip Code inside fragment
//   mitPress: function (oEvent) {
//     var that = this;
//     var CreateDipHeader = this.getView().getModel("formData");
//     var data = CreateDipHeader.getData();
//     var oModel = this.getOwnerComponent().getModel("tanks");
    

//     // Confirmation dialog
//     MessageBox.confirm(
//         "Temp and Density are fetched from O3DEFAULTS",
//         {
//             title: "Confirmation",
//             onClose: function (oAction) {
//                 if (oAction === MessageBox.Action.OK) {
//                     var oPayload = {
//                         Counter: "003",
//                         CreateDipNav01: [{
//                            Counter: "003",
//                            SocEvent: data.SocEvent,
//                            TotalheightFltp: data.TotalheightFltp,
//                            DipDate : data.DipDate,
//                            DipTime : data.DipTime
//                         }],
//                         CreateDipNav02: [{
//                            Counter: "003",
//                            TestTemp: data.TestTemp,
//                            MatTemp: data.MatTemp,
//                            TestDens: data.TestDens,
//                         }],
//                     };
//                     console.log("Payload is " + JSON.stringify(oPayload));
//                     oModel.create("/CreateDipSet", oPayload, {
//                       success: function () {
//                           MessageBox.success("Created successfully");
//                             CreateDipHeader.setData({
//                                 SocEvent: "",
//                                 TotalheightFltp: "",
//                                 TestTemp: "",
//                                 MatTemp: "",
//                                 TestDens: ""  
//                             });
//                         },
//                         error: function (error) {
//                             console.log("Error while creating the data", error);
//                             if (error.response) {
//                                 console.error("Response: ", error.response);
//                             }
//                             console.log("Error while creating the data");
//                         }
//                     });
//                 } else {
//                     // User clicked Cancel, do nothing
//                 }
//             }
//         }
//     );
// },

onSubmitPress: function (oEvent) {
  var that = this;
  var CreateDipHeader = this.getView().getModel("formData");
  var data = CreateDipHeader.getData();
  var oModel = this.getOwnerComponent().getModel("tanks");

  // Check if TestTemp and TestDens fields are empty
  if (!data.TestTemp || !data.TestDens) {
      // Confirmation dialog
      MessageBox.confirm(
          "Temp and Density are fetched from O3DEFAULTS",
          {
              title: "Confirmation",
              onClose: function (oAction) {
                  if (oAction === MessageBox.Action.OK) {
                      // Create payload and proceed with the request
                      var oPayload = {
                          Counter: "003",
                          CreateDipNav01: [{
                              Counter: "003",
                              SocEvent: data.SocEvent,
                              TotalheightFltp: data.TotalheightFltp,
                              DipDate: data.DipDate,
                              DipTime: data.DipTime
                          }],
                          CreateDipNav02: [{
                              Counter: "003",
                              TestTemp: data.TestTemp,
                              MatTemp: data.MatTemp,
                              TestDens: data.TestDens,
                          }],
                      };
                      console.log("Payload is " + JSON.stringify(oPayload));
                      oModel.create("/CreateDipSet", oPayload, {
                          success: function () {
                              MessageBox.success("Created successfully");
                              CreateDipHeader.setData({
                                  SocEvent: "",
                                  TotalheightFltp: "",
                                  TestTemp: "",
                                  MatTemp: "",
                                  TestDens: ""
                              });
                          },
                          error: function (error) {
                              console.log("Error while creating the data", error);
                              if (error.response) {
                                  console.error("Response: ", error.response);
                              }
                              console.log("Error while creating the data");
                          }
                      });
                  } else {
                      // User clicked Cancel, do nothing
                  }
              }
          }
      );
  } else {
      // Temp and Density fields are not empty, proceed without showing the confirmation dialog
      // Create payload and proceed with the request directly
      var oPayload = {
          Counter: "003",
          CreateDipNav01: [{
              Counter: "003",
              SocEvent: data.SocEvent,
              TotalheightFltp: data.TotalheightFltp,
              DipDate: data.DipDate,
              DipTime: data.DipTime
          }],
          CreateDipNav02: [{
              Counter: "003",
              TestTemp: data.TestTemp,
              MatTemp: data.MatTemp,
              TestDens: data.TestDens,
          }],
      };
      console.log("Payload is " + JSON.stringify(oPayload));
      oModel.create("/CreateDipSet", oPayload, {
          success: function () {
              MessageBox.success("Created successfully");
              CreateDipHeader.setData({
                  SocEvent: "",
                  TotalheightFltp: "",
                  TestTemp: "",
                  MatTemp: "",
                  TestDens: ""
              });
          },
          error: function (error) {
              console.log("Error while creating the data", error);
              if (error.response) {
                  console.error("Response: ", error.response);
              }
              console.log("Error while creating the data");
          }
      });
  }
},

      
      // bind details of a particular tank that is clicked
      onShowInfoPress: function(oEvent) { 
        // debugger;
        var oButton = oEvent.getSource();
        var oBindingContext = oButton.getBindingContext("tanks");
        if (oBindingContext) {
          // debugger;
            var oTank = oBindingContext.getObject();
            var selectedTankSocnr = oTank.Socnr;    
            var matchingTankData = this.stockDipData.filter(function(tankItem) {
                return tankItem.Socnr === selectedTankSocnr;
            }).
            sort(function (a, b) {
              return parseInt(b.Etmstm) - parseInt(a.Etmstm);
          })[0] || null;
            // var statusLocSelected = this.systemStatus.find(function(TankStatus){
            //   return TankStatus.Socnr ===selectedTankSocnr
            // })
            if (matchingTankData) {
                var combinedData = {
                    tankData: matchingTankData,
                    selectedTank: oTank,
                    socEvent : this.SocEventSet,
                    status:this.systemStatus,
                    location:this.location
                };
                this.openTankDetailsDialog(combinedData,oTank.Matnr);
            } else {
                var tankDataOnly = {
                    selectedTank: oTank,
                    socEvent : this.SocEventSet,
                    status:this.systemStatus,
                    location:this.location
                };    
                this.openTankDetailsDialog(tankDataOnly,oTank.Matnr);
            }
        } else {
            console.error("Binding context is undefined.");
        }
    },
    
    


      // details dialog fragment code in which bind the details of tank when user clicked on tank 
openTankDetailsDialog: function(combinedData,matnr) {
  // console.log("dialog box data is:" + JSON.stringify(combinedData));
  if (!this._oDialog) {
      this._oDialog = sap.ui.xmlfragment("tankreporting.view.DetailsDialog", this);
      this.getView().addDependent(this._oDialog);
  } 

  var oDialogModel = new sap.ui.model.json.JSONModel();
  oDialogModel.setData(combinedData);

  this._oDialog.setModel(oDialogModel, "tankDetails");
  var socEventData = combinedData.socEvent;
  var oSocEventModel = new JSONModel(socEventData);
  this._oDialog.setModel(oSocEventModel,"socEvent");
  var statusData = combinedData.status;
  var statusModel = new JSONModel(statusData);
  this._oDialog.setModel(statusModel,"status")
  var locationData = combinedData.location;
  var locModel = new JSONModel(locationData);
  this._oDialog.setModel(locModel,"location")

  var oTankLevel = this._oDialog.getContent()[0].getItems()[0].getItems()[0];
  if (oTankLevel) {
    switch (matnr) {
        case "8000":
            oTankLevel.addStyleClass("green");
            break;
        case "8100":
            oTankLevel.addStyleClass("red");
            break;
        case "84001":
            oTankLevel.addStyleClass("orange");
            break;
        default:
            oTankLevel.addStyleClass("inner_level");
            break;
    }
  }
  // console.log("all fragment model data:", this._oDialog.getModel("tankDetails").getData());
  // console.log("tankdetails fragment model data:", this._oDialog.getModel("tankDetails").getData());
  // console.log("status fragment model data:", this._oDialog.getModel("status").getData());
  // console.log("location fragment model data:", this._oDialog.getModel("location").getData());
  this._oDialog.open();
 
},
onDialogClose: function () {
  if (this._oDialog) {
    this._oDialog.destroy();
    this._oDialog = null;
  }
},


     onSuggest: function (event) {
          var sValue = event.getParameter("suggestValue");
          var oSearchField = event.getSource();
          if (sValue) {
              var aSuggestions = this.getSuggestionsFromModel(sValue);
              oSearchField.suggest(aSuggestions);
           } else {
           oSearchField.suggest([]);
        }
      },

  //    onSearch: function (oEvent) {
  //        var sTankNumber = oEvent.getParameter("query");
  //        if (this._tankData) {
  //             var oTank = this._tankData.find(function (tank) {
  //             return tank.Seqnr === sTankNumber;
  //           });
  //           console.log("new tank value is "+oTank);

  //           var selectedTankNo = oTank.Socnr;
  //           var tankData = this.stockDipData.find(function(item){
  //             return item.Socnr===selectedTankNo
  //           })
  //           if(tankData){
  //             var combinedData = {
  //               tankdata :tankData,
  //               selectedTank: oTank
  //             };
  //             this.openTankdetailsDialog(combinedData)
  //           }
  //           else{
  //             var onlyTankData = {
  //               selectedTank: oTank
  //             };
  //             this.openTankdetailsDialog(onlyTankData)
  //           }
  //          }
  //           else {
  //            MessageBox.error("Tank data is not available. Please try again.");
  //     }
  //  },

  // Searching functionality code 
  onSearch: function (oEvent) {
    var sTankNumber = oEvent.getParameter("query");
    if (this._tankData) {
        var oTank = this._tankData.find(function (tank) {
            return tank.Seqnr.toLowerCase() === sTankNumber.toLowerCase();
        });

        if (oTank) {
            console.log("new tank value is " + JSON.stringify(oTank));

            var selectedTankNo = oTank.Socnr;
            var tankData = this.stockDipData.find(function (item) {
                return item.Socnr === selectedTankNo;
            })
          //   .
          //   sort(function (a, b) {
          //     return parseInt(b.Etmstm) - parseInt(a.Etmstm);
          // })[0] || null;

            if (tankData) {
                var combinedData = {
                    tankdata: tankData,
                    selectedTank: oTank,
                    socEvent : this.SocEventSet,
                    status:this.systemStatus,
                    location:this.location
                };
                this.openTankdetailsDialog(combinedData);
            } else {
                var onlyTankData = {
                      selectedTank: oTank,
                    socEvent : this.SocEventSet,
                    status:this.systemStatus,
                    location:this.location
                };
                this.openTankdetailsDialog(onlyTankData);
            }
        } else {
          MessageBox.error(`Tank not found for Seqnr:${sTankNumber}`  );
        }
    } else {
        MessageBox.error("Tank data is not available. Please try again.");
    }
    if (!sTankNumber) {
      this.getView().byId("searchField").setSuggestionItems([]);
  }
},


// dialog box Code using with Fragment
    openTankdetailsDialog: function(combinedData) {
       console.log("data is:" + JSON.stringify(combinedData));
        if (!this._oDialog) {
         this._oDialog = sap.ui.xmlfragment("tankreporting.view.DetailsDialog", this);
         this.getView().addDependent(this._oDialog);
      }
      var oDialogModel = new JSONModel();
      oDialogModel.setData(combinedData);
      this._oDialog.setModel(oDialogModel, "tankDetails");

      var socEventData = combinedData.socEvent;
      var oSocEventModel = new JSONModel(socEventData);
      this._oDialog.setModel(oSocEventModel,"socEvent");
      var statusData = combinedData.status;
      var statusModel = new JSONModel(statusData);
      this._oDialog.setModel(statusModel,"status")
      var locationData = combinedData.location;
      var locModel = new JSONModel(locationData);
      this._oDialog.setModel(locModel,"location")
      this._oDialog.open();
     },

    getSuggestionsFromModel: function (sSearchValue) {
      var aSuggestions = [];
      var oTankModel = this.getView().getModel("tanks");
  
      if (oTankModel) {
          var aTankData = oTankModel.getProperty("/Tank_MasterSet");
  
          if (aTankData && Array.isArray(aTankData)) {
              aSuggestions = aTankData.filter(function (oItem) {
                  return oItem.Seqnr.toLowerCase().includes(sSearchValue.toLowerCase());
              });
          }
      }
      return aSuggestions.map(function (oItem) {
          return new sap.ui.core.Item({
              text: oItem.Seqnr,
              key: oItem.Seqnr
          });
      });
  },
  

   // Text percentage calculate code 
      calculatePercentageText: function (availableWater) {
        var totalCapacity = 1000;
        var percentage = (availableWater / totalCapacity) * 100;
        percentage = Math.max(0, Math.min(percentage, 100));
        return Math.round(percentage) + "%";
      },

    
    

      onEditPress1: function (oEvent) {
        const controlId = oEvent.mParameters.id;
        const oSelect = sap.ui.getCore().byId(controlId);
        oSelect.oParent.mAggregations.items[1].setEditable(true);
      },


      onStatusChange:function(oEvent){
        var oSelect = oEvent.getSource();
        updateStatus = oSelect.getSelectedKey();
      },
      onLocationChange:function(oEvent){
        var oSelect = oEvent.getSource();
        updateLocation = oSelect.getSelectedKey();
      },

      updateStatusAndLoaction:function(oEvent){
        if(!updateLocation || !updateStatus){
          MessageBox.error("please Select Update and Status")
        }
        else{
          MessageBox.success("Updated Successfully!!!")
        }
      },
     

      // status update code
      onStatsChange: function (oEvent) {
        var oSelect = oEvent.getSource();
        var sSelectedKey = oSelect.getSelectedKey();
        sap.m.MessageBox.confirm(
          "Are you sure you want to update the status?",
          {
            title: "Confirmation",
            onClose: function (oAction) {
              if (oAction === sap.m.MessageBox.Action.OK) {
                console.log("Updating status to: " + sSelectedKey);
              } else {
                oSelect.setSelectedKey(this._lastSelectedKey);
              }
            }.bind(this), 
          }
        );
      },

      // onDataLoaded: async function () {
      //   // Wait for Tanks to render (onAfterRendering method not reliable as Data takes time to load before template plots)
      //   await new Promise(resolve => setTimeout(resolve, 500))
      //   let aTankLayouts = this.byId("tank_layout")?.getItems();
      //   if (aTankLayouts?.length > 0) {
      //     aTankLayouts.forEach(container => {
      //       let tank_reporting = container?.getItems()
      //       if (tank_reporting?.length > 0) {
      //         let tank_level = tank_reporting[0]?.getItems()
      //         if (tank_level?.length > 0) {
      //           let material = tank_level[0]?.getBindingContext("tanks")?.getObject()?.Matnr
      //           switch (material) {
      //             case "8000":
      //               tank_level[0].addStyleClass("green")
      //               break;
      //             case "8100":
      //               tank_level[0].addStyleClass("orange")
      //               break;
      //             case "84001":
      //               tank_level[0].addStyleClass("red")
      //               break;
      //             default:
      //               tank_level[0].addStyleClass("inner_level")
      //               break;
      //           }
      //         }
      //       }
      //     });
      //   }
      // }
      formatHeight: function(sAvailableStock, sMaxCapacity) {
        sAvailableStock = parseFloat(sAvailableStock);
        sMaxCapacity = parseFloat(sMaxCapacity);
    
        // Check if values are valid numbers
        if (isNaN(sAvailableStock) || isNaN(sMaxCapacity)) {
            console.error("Invalid input values. Expected numeric values.");
            return '0%';
        }
    
        // Handle division by zero
        if (sMaxCapacity === 0) {
            console.error("Max Capacity is zero. Cannot calculate percentage.");
            return '0%';
        }
    
        const pCalculate = (sAvailableStock / sMaxCapacity) * 100;
        console.log("calculate Percentage", pCalculate);
    
        return pCalculate.toString() + '%';
    },
    
    
    formattextHeightPercentage: function(sAvailableStock, sMaxCapacity) {
      const pCalculate = (sAvailableStock / sMaxCapacity) * 100;
      return pCalculate.toFixed(1) + '%';
  },

  formatProductText: function(matnr) {
    console.log("my matnr is", matnr);
    switch (matnr) {
        case "8000":
            return "PMS";
        case "8100":
            return "DIESEL";
        case "84001":
            return "CRUDE";
        default:
            return "Unknown";
    }
},
  //     onTankHover: function (oEvent) {
  //       var oButton = oEvent.getSource();
  //       var oPopover = this.byId("tankPopover");
  //       oPopover.openBy(oButton);
  //   },
  //   onTankHoverOut: function () {
  //     var oPopover = this.byId("tankPopover");
  //     oPopover.close();
  // },
    //   formatTooltip: function(sSocnr,sLgort,QuanLvc) {
    //     // Assuming tank details are available in the Lgort property
    //     // You can format the tooltip text as per your requirement
    //     // return "Tank Details: " + Lgort;
    //     var tooltipContent = "S No: " + sSocnr + "\nStorage: " + sLgort;
    //     return tooltipContent;
    // },

    formatooltip: function(sSocnr, sLgort, QuanLvc) {
      var oPopover = new sap.m.Popover({
          title: "Tank Details",
          content: [
              new sap.m.VBox({
                  items: [
                      new sap.m.Label({ text: "S No:" }),
                      new sap.m.Text({ text: sSocnr }),
                      new sap.m.Label({ text: "Storage:" }),
                      new sap.m.Text({ text: sLgort }),
                      new sap.m.Label({ text: "Quantity:" }),
                      new sap.m.Text({ text: QuanLvc })
                  ]
              })
          ]
      });
      return oPopover;
  },  

 

      onPercentage:function(){
        const tankLayout = this.byId("tank_layout");
          if(tankLayout){
               tankLayout.getItems().forEach(container=>{
                const tankReporting = container.getItems();
                if(tankReporting){
                  const tankLevel = tankReporting[0]?.getItems()[0];
                  if(tankLevel){
                    const availableStock = tankLevel.getBindingContext("tanks")?.getObject()?.ADQNTP;
                    const maxCapacity = tankLevel.getBindingContext("tanks")?.getObject()?.Kapaz;
                    // console.log("quantity is",quantity,maxCapacity);
                      const pCalculate = availableStock *100/maxCapacity
                      console.log(Math.floor(pCalculate));
                      const innerLevel = tankLevel.byId("tank_level");
                      if (innerLevel) {
                          innerLevel.setHeight(`${pCalculate}%`);
                      }
                  }
                }
               })
            }
      },

      onDataLoaded: function () {
        const tankLayout = this.byId("tank_layout");
        if (tankLayout) {
            tankLayout.getItems().forEach(container => {
                const tankReporting = container.getItems();
                if (tankReporting) {
                    const tankLevel = tankReporting[0]?.getItems()[0];
                    if (tankLevel) {
                        const material = tankLevel.getBindingContext("tanks")?.getObject()?.Matnr;
                        if (material) {
                            switch (material) {
                                case "8000":
                                    tankLevel.addStyleClass("green");
                                    break;
                                case "8100":
                                    tankLevel.addStyleClass("red");
                                    break;
                                case "84001":
                                    tankLevel.addStyleClass("orange");
                                    break;
                                default:
                                    tankLevel.addStyleClass("inner_level");
                            }
                        }
                    }
                }
            });
        }
    }
    
    });
  }
);