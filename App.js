import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  Text,
  Alert,
  Button,
  Platform,
  View,
} from "react-native";

import * as IAP from "react-native-iap";

// Platform select will allow you to use a different array of product ids based on the platform
const items = Platform.select({
  ios: [],
  android: ["rniapt_699_1m"],
});

let purchaseUpdateSubscription;
let purchaseErrorSubscription;

export default function App() {
  const [purchased, setPurchased] = useState(false); //set to true if the user has active subscription
  const [products, setProducts] = useState({}); //used to store list of products

  const validate = async (receipt) => {
    try {
      // send receipt to backend
      const deliveryReceipt = await fetch("https://europe-west2-android-iap-validation-b14dd.cloudfunctions.net/validate", {
        headers: { "Content-Type": "application/json" },
        method: "POST",
        body: JSON.stringify({ data: receipt }),
      }).then((res) => {
        res.json().then((r) => {
          // do different things based on response
          if (r.result.error == -1) {
            Alert.alert("Error", "There has been an error with your purchase.");
          } else if (r.result.isActiveSubscription) {
            setPurchased(true);
          } else {
            Alert.alert("Expired", "Your subscription has expired.");
          }
        });
      });
    } catch (error) {
      Alert.alert("Error!", error.message);
    }
  };

  useEffect(() => {
    IAP.initConnection()
      .catch(() => {
        console.log("Error connecting to store..");
      })
      .then(async () => {
        IAP.getSubscriptions(items)
          .catch(() => {
            console.log("Error finding items..");
          })
          .then((res) => {
            setProducts(res);
          });

        await IAP.getPurchaseHistory()
          .then((res) => {
            try {
              const receipt = res[res.length - 1].transactionReceipt;
              if (receipt) {
                validate(receipt);
              }
            } catch (error) {}
          });
      });

    purchaseErrorSubscription = IAP.purchaseErrorListener((error) => {
      //Response code "2" is returned when the user cancels payment, when handling, we need to make sure this is ignored as can result in the application proposal being denied by Apple/Google Play.
      if (!(error["responseCode"] === "2")) {
        Alert.alert(
          "Error",
          "There has been an error with your purchase. Error code:" +
            error["code"]
        );
      }
    });
    purchaseUpdateSubscription = IAP.purchaseUpdatedListener((purchase) => {
      const receipt = purchase.transactionReceipt;
      if (receipt) {
        validate(receipt);
        IAP.finishTransaction(purchase, false);
      }
      setPurchased(true);
    });

    return () => {
      try {
        purchaseUpdateSubscription.remove();
      } catch (error) {}
      try {
        purchaseErrorSubscription.remove();
      } catch (error) {}
      try {
        IAP.endConnection();
      } catch (error) {}
    };
  }, []);

  if (purchased) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Welcome to the paid application.</Text>
        {/* <Button onPress={() => setPurchased(false)}> Logout </Button> */}
      </View>
    );
  }

  if (products.length > 0) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Welcome to the IAP demo application.</Text>
        <Text style={styles.content}>
          This app requires a subscription to use, a purchase of the
          subscription grants you access to the entire demo app.
        </Text>

        {products.map((p) => (
          <Button
            key={p["productId"]}
            title={`Purchase ${p["title"]}`}
            onPress={() => {
              console.log(p["productId"]);
              IAP.requestSubscription(p["productId"]);
            }}
          />
        ))}
      </View>
    );
  } else {
    return (
      <View style={styles.container}>
        <Text>Fetching products please wait...</Text>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "white",
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 18,
    color: "black",
  },
  content: {
    margin: 50,
  },
});