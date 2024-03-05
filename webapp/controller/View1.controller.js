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
    "sap/m/Popover",
    "sap/m/Text",
    'sap/m/MessageToast',
    "sap/ui/core/syncStyleClass"
  ],
  function (Controller, Dialog, Button, JSONModel, Filter, Fragment, FilterOperator, ODataModel, MessageBox, Popover, Text,MessageToast,syncStyleClass) {
    "use strict";
    var updateStatus, updateLocation, selectedMaterial, latestTankDataMap = {};

    return Controller.extend("tankreporting.controller.View1", {
      _oTankInfoDialog: null,
      _oDialog: null,
      oFragment: null,
      _oTankTableDialog: null,

      onInit: function () {
        var oModel = this.getOwnerComponent().getModel("tanks");

        var oTankLevel = this.getView().byId("container");

        // var oButton = this.byId("_IDGenButton1");
        // oButton.addEventDelegate({
        //   onmouseover: this.onButtonHover.bind(this)
        // });
 
        // creating model for enter dip form's payload 
        var createModel = new JSONModel({
          Counter: "",
          DipDate: "",
          DipTime: "",
          SocEvent: "",
          TestTemp: "",
          MatTemp: "",
          TestDens: "",
          Plant: "",
          StgeLoc: "",
          SeqNo: "",
          QuanLvc:"",
          TotalheightFltp: ""
        })
        this.getView().setModel(createModel, "formData");

        // creating model for tank status 
        var statusModel = new JSONModel({
          status : "",
          socnr : ""
        })
        this.getView().setModel(statusModel, "statusData");

        // creating table for tank 03Default
        var defaultModel = new JSONModel({
          temp : "",
          density :"",
          test_temp : "",
          water_sediment : ""
        })
        this.getView().setModel(defaultModel,"03_default");

        // creating table for select current and past date
        var dateModel = new JSONModel();
        var currentDate = new Date();
         dateModel.setData({
          currentDate: currentDate,
          currentTime: currentDate.toLocaleTimeString()
         });
         this.getView().setModel(dateModel, "selectDate");

        if (oModel) {
          var that = this;

          // Read Tank_MasterSet
          var tankPromise = new Promise(function (resolve, reject) {
            oModel.read("/Tank_MasterSet", {
              success: function (oData) {
                if (Array.isArray(oData.results)) {
                  // console.table(oData.results)
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
                if (Array.isArray(oData.results)) {
                  // console.table("stock_dip Data: ",oData.results)
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
                 console.log("systemStatus Data loaded successfully:", data);
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
              // for creating unique product
              success: function (data) {
                var uniqueProductGroups = [];
                var productMap = {};
                // Iterate through the results to find unique product groups
                console.log("product data is",data.results);
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
          var zTankMasterPromise = new Promise(function (resolve, reject) {
            oModel.read("/ZMaster_tank", {
              success: function (data) {
                if (Array.isArray(data.results)) {
                  console.table(data.results)
                  console.log(data.results);
                }
                that.masterSetData = data.results
                resolve();

              },
              error: function (error) {
                console.error("Error loading Tank master:", error);
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

          Promise.all([tankPromise, stockDipPromise, SocEventPromise, SystemStatusPromise, locationPromise, zTankMasterPromise, tankProductPromise]).then(function () {
            var tankData = that.masterSetData;
            var totalQuantity = 0;

            tankData.forEach(function (tank) {
              var socnr = tank.Socnr;
              var Etmstm = new Date(tank.Shorted);
              if (!latestTankDataMap[socnr] || latestTankDataMap[socnr].Shorted < Etmstm) {
                latestTankDataMap[socnr] = tank;
              }
            });
            Object.values(latestTankDataMap).forEach(function (tank) {
              var quantity = parseFloat(tank.ADQNTP);
              if (!isNaN(quantity)) {
                totalQuantity += quantity;
              } else {
                console.error('Invalid quantity:', tank.QuanSku);
              }
            });

            totalQuantity = parseFloat(totalQuantity.toFixed(2)) + "L";
            var fullTankModel = new JSONModel({
              tankData: Object.values(latestTankDataMap),
              // tankData: that._tankData,
              status: that.systemStatus,
              product: that.tankProduct,
              totalQuantity: totalQuantity
            });
            that.getView().setModel(fullTankModel, "tanks");
            // console.log("fullTankModel is"+JSON.stringify(that.getView().getModel("tanks").getData()));
            that.onDataLoaded();
            that.onPercentage()
          }).catch(function (error) {
            // console.error("Failed to load data:", error);
          });
        } else {
          MessageBox.error("Failed to load data");
        }
      },

      onChange: function (oEvent) {
        var oSelect = oEvent.getSource();
        var selectedItem = oSelect.getSelectedItem();
        var selectedText = selectedItem ? selectedItem.getText() : "";
        oSelect.setPlaceholder(selectedText);
      },

      // change handle code for datepicker
      selectDate: function (oEvent) {
        var oDateTimePicker = oEvent.getSource();
        var dipDate = oDateTimePicker.getDateValue();

        if (dipDate) {
          var formattedDate = this.formatDate(dipDate);
          var formattedTime = this.formatTime(dipDate);
          // Concatenate formatted date with "T00:00:00"
          var combinedDateTimeString = formattedDate + "T00:00:00";
          var combinedTimeString = formattedTime;

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
        return isoDuration;
      },



      // change label based on selected item in enter dip form
      onDipType: function (oEvent) {
        // debugger;
        var selectedKey = oEvent.getSource().getSelectedKey();
        var selectedText = oEvent.getSource().getSelectedItem().getText();
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
      onProductFilter: function (oEvent) {
        var oValidatedComboBox = oEvent.getSource(),
          sSelectedKey = oValidatedComboBox.getSelectedKey(),
          selectedMaterial = oValidatedComboBox.getValue();
        var productValue = this.getView().byId("filterDropdown3")
        productValue.setValue("")

        var oMaterialsModel = this.getView().getModel("tanks");
        var aFilteredProduct = oMaterialsModel.getProperty("/product").filter(function (product) {
          return product.ProductGroup === selectedMaterial;
        });
       
        var extractedProperties = aFilteredProduct.map(function (product) {
          return {
            Material: product.MaterialCode,
          };
        });
        var mModel = new JSONModel(extractedProperties[0].Material)
        this.getView().setModel(mModel, "materialFilter")
        console.log("product filter is", this.getView().getModel("materialFilter").getData());

      },



      // on filter with Material code through change handler on combobox
      onMterialFilter: function (oEvent) {
        var oValidatedComboBox = oEvent.getSource(),
          sSelectedKey = oValidatedComboBox.getSelectedKey(),
          selectedMaterial = oValidatedComboBox.getValue();
        console.log("material no is", selectedMaterial, latestTankDataMap);

        var latestTankDataArray = Object.values(latestTankDataMap);
        var filterTankMatnr = latestTankDataArray.filter(function (tank) {
          return tank.Matnr === selectedMaterial;
        });

        var oFlexBox = this.getView().byId("tank_layout");
        var oModel = new JSONModel({
          tankData: filterTankMatnr
        });
        oFlexBox.setModel(oModel, "tanks");
        console.log("selected matnr tank is", filterTankMatnr);
      },

      onFilterRefreshPressed: function () {
        this.showAllTanks();
      },
     



      // write code for Go filter Button code 
      onFilterGoPressed: function () {
        
        var productItem = this.byId("filterDropdown2").getValue();
        var materialItem = this.byId("filterDropdown3").getValue();

        if (!productItem || !materialItem) {
          MessageBox.error("Please Select Product and Material");
        } else {
          var selectedItem = this.byId("filterDropdown3");
          var selectedMatnr = selectedItem.getValue();

          var latestTankDataArray = Object.values(latestTankDataMap);
          var filterTankMatnr = latestTankDataArray.filter(function (tank) {
            return tank.Matnr === selectedMatnr;
          });

          if (filterTankMatnr.length === 0) {
            var that = this;
            MessageBox.error(`No tanks found for selected material number: ${selectedMatnr}`, {
              onClose: function (oAction) {
                if (oAction === MessageBox.Action.CLOSE) {
                  that.showAllTanks(); // Call function to show all tanks
                }
              }
            });
            return;
          }
          

          var totalQuantity = filterTankMatnr.reduce(function (total, tank) {
            return total + parseFloat(tank.ADQNTP || 0);
          }, 0);

          var oFlexBox = this.getView().byId("tank_layout");
          var oModel = new JSONModel({
            tankData: filterTankMatnr,
            totalQuantity: totalQuantity
          });
          oFlexBox.setModel(oModel, "tanks");

          var totalQuantityText = this.byId("total_calculated");
          totalQuantityText.setText(`${totalQuantity.toString()} L`);
          this.onDataLoaded()
        }
      }, 
      
    // write code for showing all tanks
      showAllTanks: function () {
        var latestTankDataArray = Object.values(latestTankDataMap);
        var totalQuantity = latestTankDataArray.reduce(function (total, tank) {
            return total + parseFloat(tank.ADQNTP || 0);
        }, 0);
    
        var oFlexBox = this.getView().byId("tank_layout");
        var oModel = new JSONModel({
            tankData: latestTankDataArray,
            totalQuantity: totalQuantity
        });
        oFlexBox.setModel(oModel, "tanks");
    
        var totalQuantityText = this.byId("total_calculated");
        totalQuantityText.setText(`${totalQuantity.toString()} L`);
    
        var filterDropdown1 = this.byId("filterDropdown2");
        var filterDropdown2 = this.byId("filterDropdown3");
        if (filterDropdown1 || filterDropdown2) {
            filterDropdown1.setValue("");
            filterDropdown2.setValue("");
        }
        this.onDataLoaded()
    },


  // write code for input validation for volume 
    onLiveChangeOnVolume: function(oEvent) {
      var tankDetailsModel = this._oDialog.getModel("tankDetails");
      var maxCapacity = parseFloat(tankDetailsModel.getProperty("/selectedTank/Kapaz")); 
      // console.log("max capacity:", maxCapacity); 
  
      var input = oEvent.getSource();
      var value = input.getValue();
      var numberPattern = /^\d*\.?\d*$/;
      var isValid = numberPattern.test(value);
    
      // If the entered value is not a number, display an error message
      if (!isValid) {
          input.setValueState("Error");
          input.setValueStateText("Please enter a valid number");
      } else {
          var enteredValue = parseFloat(value);
          // If the entered value is greater than max, display an error message
          if (enteredValue > maxCapacity) {
              input.setValueState("Error");
              input.setValueStateText("Entered value exceeds maximum capacity");
          } else {
              // If the entered value is valid, clear the error state
              input.setValueState("None");
              input.setValueStateText("");
          }
      }
  },
  

    // for validation check when enter the value in input box
    onLiveChange: function (oEvent) {
      var input = oEvent.getSource();
      var value = input.getValue();
  
      // Regular expression to match integer or decimal values
      var numberPattern = /^\d*\.?\d*$/;
  
      // Check if the entered value is a number (integer or decimal)
      var isValid = numberPattern.test(value);
  
      // If the entered value is not a number, display an error message
      if (!isValid) {
          input.setValueState("Error");
          input.setValueStateText("Please enter a valid number");
      } else {
          // If the entered value is valid, clear the error state
          input.setValueState("None");
          input.setValueStateText("");
      }
  },  

      // write code for Submit dip for tank inside details fragment
     
      onSubmitPress: function (oEvent) {
        var that = this;
        var CreateDipHeader = this.getView().getModel("formData");
        var tankDetailsModel = this._oDialog.getModel("tankDetails");
        var QuanSku = tankDetailsModel.getProperty("/selectedTank/QuanSku");  
        var plant = tankDetailsModel.getProperty("/selectedTank/Werks");  
        var Soc_no = tankDetailsModel.getProperty("/selectedTank/Seqnr");  
        var StorageLoc = tankDetailsModel.getProperty("/selectedTank/Lgort");  
        CreateDipHeader.setProperty("/QuanLvc", QuanSku);
        CreateDipHeader.setProperty("/Plant", plant);
        CreateDipHeader.setProperty("/SeqNo", Soc_no);
        CreateDipHeader.setProperty("/StgeLoc", StorageLoc);
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
                      Plant: data.Plant,
                      StgeLoc: data.StgeLoc,
                      SeqNo: data.SeqNo,
                      DipDate: data.DipDate,
                      DipTime: data.DipTime,
                      SocEvent: data.SocEvent,
                      QuanLvc: data.TotalheightFltp,
                      TvolUom: "L",
                    }],
                    CreateDipNav02: [{
                      Counter: "003",
                      TestTemp: data.TestTemp || 0,
                      TestTempUom:"CEL",
                      MatTemp: data.MatTemp,
                      MatTempUom:"CEL",
                      TestDens: data.TestDens || 0,
                      TestDensUom:"KGV"
                    }],
                  };
                  oModel.create("/CreateDipSet", oPayload, {
                    success: function () {
                      MessageBox.success("Created successfully");
                      CreateDipHeader.setData({
                        Counter: "",
                        DipDate: "",
                        DipTime: "",
                        SocEvent: "",
                        TestTemp: "",
                        MatTemp: "",
                        TestDens: "",
                        Plant: "",
                        StgeLoc: "",
                        SeqNo: "",
                        QuanLvc:"",
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
              Plant: data.Plant,
              StgeLoc: data.StgeLoc,
              SeqNo: data.SeqNo,
              DipDate: data.DipDate,
              DipTime: data.DipTime,
              SocEvent: data.SocEvent,
              QuanLvc: data.TotalheightFltp,
              TvolUom: "L",
            }],
            CreateDipNav02: [{
              Counter: "003",
              TestTemp: data.TestTemp,
              TestTempUom:"CEL",
              MatTemp: data.MatTemp,
              MatTempUom:"CEL",
              TestDens: data.TestDens,
              TestDensUom:"KGV"
            }],
          };
          console.log("Payload is " + JSON.stringify(oPayload));
          oModel.create("/CreateDipSet", oPayload, {
            success: function () {
              MessageBox.success("Created successfully");
              CreateDipHeader.setData({
                Counter: "",
                DipDate: "",
                DipTime: "",
                SocEvent: "",
                TestTemp: "",
                MatTemp: "",
                TestDens: "",
                Plant: "",
                StgeLoc: "",
                SeqNo: "",
                QuanLvc:"",
              });
              this.getOwnerComponent().getModel("tanks").refresh();
                        },
            error: function (error) {
              // console.log("Error while creating the data", error.message);
              MessageBox.error(error.message)
              if (error.response) {
                console.error("Response: ", error.response);
              }
              console.log("Error while creating the data");
              if (error?.responseText) {
                try {                  
                  let parsedResponseText = JSON.parse(error?.responseText);
                  if (Array.isArray(parsedResponseText?.error?.innererror?.errordetails)) {
                    let aErrorDetails = parsedResponseText?.error?.innererror?.errordetails;
                    if (aErrorDetails.length) {
                      that.handleBapiError(aErrorDetails);
                    }
                  }
                } catch (err) {
                  console.log("Error:", error.message);
                }
              }
            }
          });
        }
      },

      handleBapiError: function (aError) {
        if (!Array.isArray(aError) || aError.length === 0) return;
    
        const errorMessage = aError.map(error => error.message).join("\n");
        MessageBox.error(errorMessage);
    },

      // handleBapiError: function (aError) {
      //   let oBapiErrorModel = new JSONModel({
      //     error: aError
      //   });

      //   //Error Table
      //   this._initializeErrorTable(oBapiErrorModel);

      //   //Dialog
      //   this._initializeErrorDialog();

      //   //Open Dialog
      //   this._oErrorDialog.open();
      // },

      _initializeErrorDialog: function () {
        if (this._oErrorDialog) return;
        
        this._oErrorDialog = new sap.m.Dialog({
          content: [this._oErrorTable]
        })
      },
      

      _initializeErrorTable: function (oBapiErrorModel) {
        if (this._oErrorTable) {
          this._oErrorTable.setModel(oBapiErrorModel);
          this._oErrorTable.getModel().refresh();
          return;
        }
        this._oErrorTable = new sap.m.Table({
          columns: [
            new sap.m.Column({
              text: "ContentID"
            }),
            new sap.m.Column({
              text: "code"
            }),
            new sap.m.Column({
              text: "message"
            }),
            new sap.m.Column({
              text: "propertyref"
            }),
            new sap.m.Column({
              text: "severity"
            }),
            new sap.m.Column({
              text: "target"
            }),
            new sap.m.Column({
              text: "transition"
            }),
          ]
        })
        this._oErrorTable.setModel(oBapiErrorModel);
        this._oErrorTable.bindItems({
          path: "/error",
          template: new sap.m.ColumnListItem({
            cells: [
              new sap.m.Text({ text: "{ContentID}" }),
              new sap.m.Text({ text: "{code}" }),
              new sap.m.Text({ text: "{message}" }),
              new sap.m.Text({ text: "{propertyref}" }),
              new sap.m.Text({ text: "{severity}" }),
              new sap.m.Text({ text: "{target}" }),
              new sap.m.Text({ text: "{transition}" }),
            ]
          })
        })
      },
      onUpdateDefault:function(){
        debugger;
          var oModel = this.getView().getModel("03_default")
          console.log("update data is",oModel.getData());
      },

      // bind details of a particular tank that is clicked
      onShowInfoPress: function (oEvent) {
        debugger;
        var oButton = oEvent.getSource();
        var oBindingContext = oButton.getBindingContext("tanks");
        if (oBindingContext) {
          var oTank = oBindingContext.getObject();
          var selectedTankSocnr = oTank.Socnr;
          var matchingTankData = this.stockDipData.filter(function (tankItem) {
            return tankItem.Socnr === selectedTankSocnr;
          }).
            sort(function (a, b) {
              return parseInt(b.Etmstm) - parseInt(a.Etmstm);
            })[0] || null;
          
          if (matchingTankData) {
            var combinedData = {
              tankData: matchingTankData,
              selectedTank: oTank,
              socEvent: this.SocEventSet,
              status: this.systemStatus,
              location: this.location
            };
            this.openTankDetailsDialog(combinedData, oTank.Matnr);
          } else {
            var tankDataOnly = {
              selectedTank: oTank,
              socEvent: this.SocEventSet,
              status: this.systemStatus,
              location: this.location
            };
            this.openTankDetailsDialog(tankDataOnly, oTank.Matnr);
          }
        } else {
          console.error("Binding context is undefined.");
        }
      },

     //write code for show all tanks in Table
     onShowAllTanksTable:function(){
      this.onOpenTanksTableDialog();
      },

      onOpenTanksTableDialog:function(){
        if (!this._oTankTableDialog) {
          this._oTankTableDialog = sap.ui.xmlfragment("tankreporting.view.TanksTableDialog", this);
          this.getView().addDependent(this._oTankTableDialog);
        }
        this._oTankTableDialog.open();
      },

      onCloseTankTableDialog: function() {
        this._oTankTableDialog.close();
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


      // Searching functionality code for UI
      onSearch: function (oEvent) {
        var sTankNumber = oEvent.getParameter("query");
    
        // Check if the search query is not empty or null
        if (sTankNumber) {
            if (this._tankData) {
                var oTank = this._tankData.find(function (tank) {
                    return tank.Seqnr.toLowerCase() === sTankNumber.toLowerCase();
                });
    
                if (oTank) {
                    // Existing logic to handle tank data when found
                    var selectedTankNo = oTank.Socnr;
                    var selectData = this.masterSetData.find(function(item){
                        return item.Socnr === selectedTankNo;
                    });
                    var tankData = this.stockDipData.find(function (item) {
                        return item.Socnr === selectedTankNo;
                    });
    
                    if (tankData) {
                        var combinedData = {
                            tankData: tankData,
                            selectedTank: selectData,
                            socEvent: this.SocEventSet,
                            status: this.systemStatus,
                            location: this.location
                        };
                        this.openTankDetailsDialog(combinedData, selectData.Matnr);
                    } else {
                        var onlyTankData = {
                            selectedTank: oTank,
                            socEvent: this.SocEventSet,
                            status: this.systemStatus,
                            location: this.location
                        };
                        this.openTankDetailsDialog(onlyTankData, null);
                    }
                } else {
                    MessageBox.error(`Tank not found for Seqnr: ${sTankNumber}`);
                }
            } else {
                MessageBox.error("Tank data is not available. Please try again.");
            }
        } else {
            // Handle the case when the search query is empty or null
            // For example, clear suggestions or perform other actions
            // this.getView().byId("searchField").setSuggestionItems([]);
        }
    }
,    

       // details dialog fragment code in which bind the details of tank when user clicked on tank 
       openTankDetailsDialog: function (combinedData, matnr) {
        // console.log("dialog box data is:" + JSON.stringify(matnr));
        if (!this._oDialog) {
          this._oDialog = sap.ui.xmlfragment("tankreporting.view.DetailsDialog", this);
          this.getView().addDependent(this._oDialog);
        }
        var oDialogModel = new sap.ui.model.json.JSONModel();
        oDialogModel.setData(combinedData);

        this._oDialog.setModel(oDialogModel, "tankDetails");
        var socEventData = combinedData.socEvent;
        var oSocEventModel = new JSONModel(socEventData);
        this._oDialog.setModel(oSocEventModel, "socEvent");
        var statusData = combinedData.status;
        var statusModel = new JSONModel(statusData);
        this._oDialog.setModel(statusModel, "status")
        var locationData = combinedData.location;
        var locModel = new JSONModel(locationData);
        this._oDialog.setModel(locModel, "location")

        var oTankLevel = this._oDialog.getContent()[0].getItems()[0].getItems()[0];
        if (oTankLevel) {
          switch (matnr) {
            case "8000":
              oTankLevel.addStyleClass("pms");
              break;
            case "8100":
              oTankLevel.addStyleClass("diesel");
              break;
            case "84001":
              oTankLevel.addStyleClass("crude");
              break;
            default:
              oTankLevel.addStyleClass("inner_level");
              break;
          }
        }
        // console.log("all fragment model data:", this._oDialog.getModel("tankDetails").getData());
        this._oDialog.open();
  
      },
      onDialogClose: function () {
        if (this._oDialog) {
          var CreateDipHeader = this.getView().getModel("formData");
          CreateDipHeader.setData({
              Counter: "",
              DipDate: "",
              DipTime: "",
              SocEvent: "",
              TestTemp: "",
              MatTemp: "",
              TestDens: "",
              Plant: "",
              StgeLoc: "",
              SeqNo: "",
              QuanLvc:"",
          });
          this._oDialog.destroy();
          this._oDialog = null;
        }
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


      onStatusChange: function (oEvent) {
        var selectedKey = oEvent.getSource().getSelectedKey();
        var formDataModel = this.getView().getModel("statusData");
        formDataModel.setProperty("/status", selectedKey);
      },


      // Define the formatter function for showing the actual stock in tank's card
    formatStockText: function(value) {
     var floatValue = parseFloat(value);
       if (!isNaN(floatValue)) {
          var intValue = Math.floor(floatValue);
          return intValue.toString();
        } else {
           return "";
      }
    },

  
      updateStatus: function (oEvent) {
        var that = this;
        var statusDipData = this.getView().getModel("statusData");
        var tankDetailsModel = this._oDialog.getModel("tankDetails");
        var socnr = tankDetailsModel.getProperty("/selectedTank/Socnr");  
        statusDipData.setProperty("/socnr", socnr);
        var data = statusDipData.getData();
        var oModel = this.getOwnerComponent().getModel("tanks"); 
        var statusDataPayload = {
          Socnr : data.socnr,
          Zzstatus : data.status
        }
        console.log("update data",statusDataPayload);
        oModel.create("/System_statusSet",statusDataPayload,{
         success:function(){
          MessageBox.success("Update successfully!!")
          statusDipData.setData({
            socnr:"",
            status:""
          })
         },
         error:function(error){
              console.log("Error while creating the data", error);
             if (error.response) {
                    console.error("Response: ", error.response);
                  }
                  console.log("Error while creating the data");
           }
        })
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

    // calculate the height for creating tank inner level
      formatHeight: function (sAvailableStock, sMaxCapacity) {
        sAvailableStock = parseFloat(sAvailableStock);
        sMaxCapacity = parseFloat(sMaxCapacity);
        if (isNaN(sAvailableStock) || isNaN(sMaxCapacity)) {
            return '0%';
        }
        if (sMaxCapacity === 0 || sAvailableStock < 0) {
            return '0%';
        }
        if (sAvailableStock > sMaxCapacity) {
            sAvailableStock = sMaxCapacity;
        }
        const percentage = (sAvailableStock / sMaxCapacity) * 100;
        const formattedPercentage = Math.max(0, Math.min(100, percentage));
        return formattedPercentage.toFixed(2) + '%'; 
    },
    

    // calculate height in percentage to given height of tank
      formattextHeightPercentage: function (sAvailableStock, sMaxCapacity) {
        const pCalculate = (sAvailableStock / sMaxCapacity) * 100;
        return pCalculate.toFixed(1) + '%';
      },

    // find product based on material no and shown on tank card
      formatProductText: function (matnr) {
        switch (matnr) {
          case "8000":
            return "PMS";
          case "8100":
            return "DIESEL";
          case "84001":
            return "CRUDE";
          default:
            return "ADD";
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

      formatooltip: function (sSocnr, sLgort, QuanLvc) {
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



      onPercentage: function () {
        const tankLayout = this.byId("tank_layout");
        if (tankLayout) {
          tankLayout.getItems().forEach(container => {
            const tankReporting = container.getItems();
            if (tankReporting) {
              const tankLevel = tankReporting[0]?.getItems()[0];
              if (tankLevel) {
                const availableStock = tankLevel.getBindingContext("tanks")?.getObject()?.ADQNTP;
                const maxCapacity = tankLevel.getBindingContext("tanks")?.getObject()?.Kapaz;
                // console.log("quantity is",quantity,maxCapacity);
                const pCalculate = availableStock * 100 / maxCapacity
                const innerLevel = tankLevel.byId("tank_level");
                if (innerLevel) {
                  innerLevel.setHeight(`${pCalculate}%`);
                }
              }
            }
          })
        }
      },


      // craeting a table of all tanks and showing it inside a fragment
      handleTableSelectDialogPress: function (oEvent) {
        var oButton = oEvent.getSource(),
          oView = this.getView();
  
        if (!this._pDialog) {
          this._pDialog = Fragment.load({
            id: oView.getId(),
            name: "tankreporting.view.TanksTableDialog",
            controller: this
          }).then(function(oDialog){
            oView.addDependent(oDialog);
            return oDialog;
          });
        }
  
        this._pDialog.then(function(oDialog){
          this._configDialog(oButton, oDialog);
          oDialog.open();
        }.bind(this));
      },
  
      _configDialog: function (oButton, oDialog) {
        // Set draggable property
        var bDraggable = oButton.data("draggable");
        oDialog.setDraggable(bDraggable == "true");
        // Set resizable property
        var bResizable = oButton.data("resizable");
        oDialog.setResizable(bResizable == "true");
        // Multi-select if required
        var bMultiSelect = !!oButton.data("multi");
        oDialog.setMultiSelect(bMultiSelect);
        // Remember selections if required
        var bRemember = !!oButton.data("remember");
        oDialog.setRememberSelections(bRemember);
        var sResponsivePadding = oButton.data("responsivePadding");
        var sResponsiveStyleClasses = "sapUiResponsivePadding--header sapUiResponsivePadding--subHeader sapUiResponsivePadding--content sapUiResponsivePadding--footer";
        if (sResponsivePadding) {
          oDialog.addStyleClass(sResponsiveStyleClasses);
        } else {
          oDialog.removeStyleClass(sResponsiveStyleClasses);
        }
        // Set custom text for the confirmation button
        var sCustomConfirmButtonText = oButton.data("confirmButtonText");
        oDialog.setConfirmButtonText(sCustomConfirmButtonText);
        // toggle compact style
        syncStyleClass("sapUiSizeCompact", this.getView(), oDialog);
      },
    
      // create code for live search items in a table inside the dialog 
      handleLiveChange: function (oEvent) {
        var sQuery = oEvent.getParameter("value");
        var aFilters = [];
        if (sQuery) {
            var oFilter1 = new Filter("Matnr", FilterOperator.Contains, sQuery);
            var oFilter2 = new Filter("Lgort", FilterOperator.Contains, sQuery);
            var oFilter3 = new Filter("Seqnr", FilterOperator.Contains, sQuery);
            
            aFilters.push(new Filter([oFilter1, oFilter2,oFilter3], false));
        }
        var oBinding = oEvent.getSource().getBinding("items");
        oBinding.filter(aFilters);
    },        

    // create code for search functionality when pressed enter
      handleSearch: function(oEvent) {
        var sValue = oEvent.getParameter("value");
        var oFilterLgort = new Filter("Lgort", FilterOperator.Contains, sValue);
        var oFilterMatnr = new Filter("Matnr", FilterOperator.Contains, sValue);
        var oFilterSeqnr = new Filter("Seqnr", FilterOperator.Contains, sValue);
        var oFilter = new Filter({
          filters: [oFilterLgort, oFilterMatnr,oFilterSeqnr],
          and: false
        });
        var oBinding = oEvent.getSource().getBinding("items");
        oBinding.filter(oFilter);
      },

      // write code for count the total tanks inside the dialog box
      formatItemCount: function (aItems) {
        return aItems.length + " items"
      },
       
  // tanks table's close code for dialog box
      handleClose: function (oEvent) {
        // reset the filter
        var oBinding = oEvent.getSource().getBinding("items");
        oBinding.filter([]);
        var aContexts = oEvent.getParameter("selectedContexts");
      },

      //write code for Handle the row selection change event and showing tank details dialog
      onSelectRow: function(oEvent) {
      var oDialog = oEvent.getSource() 
      var oSelectedItem = oEvent.getParameter("listItem");
       if (oSelectedItem) {
        var sSocnr = oSelectedItem.getBindingContext("tanks").getProperty("Socnr");
        var masterData = this.masterSetData.filter(function(tankSocnr){
          return tankSocnr.Socnr==sSocnr;
        })
        
        var matchingTankData = this.stockDipData.filter(function (tankItem) {
          return tankItem.Socnr === sSocnr;
        }).
          sort(function (a, b) {
            return parseInt(b.Etmstm) - parseInt(a.Etmstm);
          })[0] || null;        }
          if (matchingTankData) {
            var combinedData = {
              tankData: matchingTankData,
              selectedTank: masterData[0],
              socEvent: this.SocEventSet,
              status: this.systemStatus,
              location: this.location
            };
            this.openTankDetailsDialog(combinedData, masterData[0].Matnr);
          } else {
            var tankDataOnly = {
              selectedTank: masterData[0],
              socEvent: this.SocEventSet,
              status: this.systemStatus,
              location: this.location
            };
            this.openTankDetailsDialog(tankDataOnly, masterData[0].Matnr);
          }
        },
  
      
      // write code for applied class on tanks when tanks are loaded
      onDataLoaded: function () {
        let that = this;
        // debugger;
        const tankLayout = this.byId("tank_layout");
        if (tankLayout) {
          tankLayout.getItems().forEach(container => {
            const tankReporting = container.getItems();
            if (tankReporting) {
              const tankLevel = tankReporting[0]?.getItems()[0];
              if (tankLevel) {
                const material = tankLevel.getBindingContext("tanks")?.getObject()?.Matnr;
                if (material) {
                  that.resetStyleClass(tankLevel);
                  switch (material) {
                    case "8000":
                      tankLevel.addStyleClass("pms");
                      break;
                    case "8100":
                      tankLevel.addStyleClass("diesel");
                      break;
                    case "84001":
                      tankLevel.addStyleClass("crude");
                      break;
                    default:
                      tankLevel.addStyleClass("inner_level");
                  }
                }
              }
            }
          });
        }
      },
      resetStyleClass: function (tankLevel) {
        if(tankLevel.hasStyleClass('crude')) tankLevel.removeStyleClass('crude')
        if(tankLevel.hasStyleClass('diesel')) tankLevel.removeStyleClass('diesel')
        if(tankLevel.hasStyleClass('pms')) tankLevel.removeStyleClass('pms')
      }

    });
  }
);


