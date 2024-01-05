////controller


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
  ],
  function ( Controller,Dialog,Button,JSONModel,Filter,Fragment,MessageBox,FilterOperator,ODataModel,MessageToast){
    "use strict";

    return Controller.extend("tankreporting.controller.View1", {
      _oTankInfoDialog: null,
      _oDialog:null,
      oFragment:null,

    //   onInit: function () {
    //     var oModel = this.getOwnerComponent().getModel("tanks");
    //     if (oModel) {
    //        var that = this; 
    //        oModel.read("/Tank_MasterSet", {
    //           success: function (oData) {
    //             //  console.log("Data loaded successfully:", oData);
    //              that._tankData = oData.results;
    //           },
    //           error: function (oError) s{
    //              console.error("Error reading OData service:", oError);
    //           }
    //        });
    //        oModel.read("/Stock_DipSet", {
    //         success: function(data) {
    //             that.stockDipData = data.results;
    //         },
    //         error: function(error) {
    //           console.error("Error reading OData service:", error);
    //         }
    //     });
    //        this.getView().setModel(oModel, "tanks");
    //     } else {
    //        console.error("Failed to load model 'tanks'.");
    //     }
    //  },
    

    onInit: function () {
      var oModel = this.getOwnerComponent().getModel("tanks");
      // debugger;

      var createModel = new JSONModel({
        TestTemp : "",
        MatTemp:"",
        TestDens:"",
        SocEvent:"c",
        TotalheightFltp:""
      })
      this.getView().setModel(createModel,"formData")
  
      if (oModel) {
          var that = this;
  
          // Read Tank_MasterSet
          var tankPromise = new Promise(function (resolve, reject) {
              oModel.read("/Tank_MasterSet", {
                  success: function (oData) {
                      // console.log("Data loaded successfully:", oData);
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
                  success: function (data) {
                      that.stockDipData = data.results;
                      resolve();
                  },
                  error: function (error) {
                      console.error("Error reading Stock_DipSet:", error);
                      reject(error);
                  }
              });
          });
  
          Promise.all([tankPromise, stockDipPromise]).then(function () {
              that.getView().setModel(oModel, "tanks");
          }).catch(function (error) {
              console.error("Failed to load data:", error);
          });
      } else {
          console.error("Failed to load model 'tanks'.");
      }
  },
  
     

      // dropdown multiple filter code 
        onFilterChange: function (oEvent) {
        var sKey = oEvent.getParameter("selectedItem").getKey();
        switch (sKey) {
          case "loading":
            this.applyFilter(0, 500);
            break;
          case "receiving":
            this.applyFilter(500, 850);
            break;
          case "maintenance":
            // Handle maintenance filter
            break;
            case "all":
              this.applyFilter(0,1000);
              break;
          default:
            this.applyFilter(0, 1000); 
            break;
        }
      },    
    
      
      // bind details of a particular tank that is clicked

      onShowInfoPress: function(oEvent) {
        var oButton = oEvent.getSource();
        var oBindingContext = oButton.getBindingContext("tanks");
    
        if (oBindingContext) {
            var oTank = oBindingContext.getObject();
            var selectedTankSocnr = oTank.Socnr;    
            var matchingTankData = this.stockDipData.find(function(tankItem) {
                return tankItem.Socnr === selectedTankSocnr;
            });
            if (matchingTankData) {
                var combinedData = {
                    tankData: matchingTankData,
                    selectedTank: oTank
                };
                this.openTankDetailsDialog(combinedData);
            } else {
                var tankDataOnly = {
                    selectedTank: oTank
                };    
                this.openTankDetailsDialog(tankDataOnly);
            }
        } else {
            console.error("Binding context is undefined.");
        }
    },
    
    


      // details dialog fragment that bind the details that come from by button clicked
// openTankDetailsDialog: function(combinedData) {
//   let that = this;
//   if (!this._oDialog) {
//       sap.ui.core.Fragment.load({
//           name: "tankreporting.view.DetailsDialog",
//       }).then((oDialog) => {
//         this._oDialog = oDialog;
//         this.getView().addDependent(this._oDialog);
//           var oDialogModel = new sap.ui.model.json.JSONModel();
//           oDialogModel.setData(combinedData);
//           this._oDialog.setModel(oDialogModel, "tankDetails");
//           this._oDialog.open();
//       }).catch((error) => {
//           console.error("Error loading fragment:", error);
//       });
//   } else {
//       var oDialogModel = new sap.ui.model.json.JSONModel();
//       oDialogModel.setData(combinedData);
//       this._oDialog.setModel(oDialogModel, "tankDetails");
//       this._oDialog.open();
//   }
// },

// onDialogClose: function () {
//   if (this._oDialog) {
//       this._oDialog.destroy();
//       this._oDialog = null;
//   }
// },    

openTankDetailsDialog: function(combinedData) {
  console.log("dialog box data is:" + JSON.stringify(combinedData));
  if (!this._oDialog) {
      this._oDialog = sap.ui.xmlfragment("tankreporting.view.DetailsDialog", this);
      this.getView().addDependent(this._oDialog);
  }

  var oDialogModel = new sap.ui.model.json.JSONModel();
  oDialogModel.setData(combinedData);
  this._oDialog.setModel(oDialogModel, "tankDetails");
  this._oDialog.open();
},
onDialogClose: function () {
  if (this._oDialog) {
    this._oDialog.destroy();
    this._oDialog = null;
  }
},
      // calculate level height
      calculateHeight: function (availableWater) {
        var totalCapacity = 1000;
        var percentage = (availableWater / totalCapacity) * 100;
        if (isNaN(percentage) || !isFinite(percentage)) {
          console.error("Invalid percentage value:", percentage);
          return "0%";
        }
        percentage = Math.max(0, Math.min(percentage, 100));
        var backgroundColorClass = this.calculateBackgroundColor(percentage);
        return percentage + "%";
      },

    //  apply color according to height
      calculateBackgroundColor: function (percentage) {
        console.log("calcuate background percentage"+percentage);
        if (percentage < 20) {
          return "yellow-background";
        } else if (percentage >= 20 && percentage <= 80) {
          return "green-background";
        } else {
          return "red-background";
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

     onSearch: function (oEvent) {
         var sTankNumber = oEvent.getParameter("query");
         if (this._tankData) {
              var oTank = this._tankData.find(function (tank) {
              return tank.Seqnr === sTankNumber;
            });

            var selectedTankNo = oTank.Socnr;
            var tankData = this.stockDipData.find(function(item){
              return item.Socnr===selectedTankNo
            })
            if(tankData){
              var combinedData = {
                tankdata :tankData,
                selectedTank: oTank
              };
              this.openTankdetailsDialog(combinedData)
            }
            else{
              var onlyTankData = {
                selectedTank: oTank
              };
              this.openTankdetailsDialog(onlyTankData)
            }
           }
            else {
             MessageBox.error("Tank data is not available. Please try again.");
      }
   },

    openTankdetailsDialog: function(combinedData) {
       console.log("data is:" + JSON.stringify(combinedData));
    if (!this._oDialog) {
         this._oDialog = sap.ui.xmlfragment("tankreporting.view.DetailsDialog", this);
         this.getView().addDependent(this._oDialog);
      }
      var oDialogModel = new sap.ui.model.json.JSONModel();
      oDialogModel.setData(combinedData);
      this._oDialog.setModel(oDialogModel, "tankDetails");
      this._oDialog.open();
     },

    getSuggestionsFromModel: function (sSearchValue) {
         var aFilteredSuggestions = this.getView().getModel("tanks").getProperty("/Tank_MasterSet")
        .filter(function (oItem) {
            return oItem.Seqnr.toLowerCase().includes(sSearchValue.toLowerCase());
         });
         return aFilteredSuggestions.map(function (oItem) {
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


      onSubmitPress: function (oEvent) {
        var fData = this.getView().getModel("formData").getData();
        if (fData) {
          console.log("Input Value:", fData); 
          var odataModel = this.getView().getModel("tanks");
          odataModel.create("/CreateTankDipSet", fData, {
              success:  (data, response) =>{ 
                  console.log("Data successfully created");
              },
              error: function (error) {
                  console.log("Error while creating the data");
              }   
            })
        } else {
          debugger;
          console.error("Input control not found");
        }
      },

      onEditPress1: function (oEvent) {
        const controlId = oEvent.mParameters.id;
        const oSelect = sap.ui.getCore().byId(controlId);
        oSelect.oParent.mAggregations.items[1].setEditable(true);
      },

      onStatusChange: function (oEvent) {
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
    });
  }
);