import { useThemeColor } from "@/hooks/use-theme-color";
import * as Print from "expo-print";
import { useEffect, useRef, useState } from "react";
import { Alert, BackHandler, Platform, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { WebView } from "react-native-webview";

export default function HomeScreen() {
  const webViewRef = useRef<WebView | null>(null);
  const [canGoBack, setCanGoBack] = useState(false);
  const backgroundColor = useThemeColor({}, "background");
  const insets = useSafeAreaInsets();

  // Handle Android back button
  useEffect(() => {
    const backAction = () => {
      if (canGoBack && webViewRef.current) {
        webViewRef.current.goBack();
        return true; // prevent app from closing
      } else {
        Alert.alert("Hold on!", "Do you want to exit ZAT ERP?", [
          { text: "Cancel", style: "cancel" },
          { text: "YES", onPress: () => BackHandler.exitApp() },
        ]);
        return true;
      }
    };

    const backHandler = BackHandler.addEventListener("hardwareBackPress", backAction);

    return () => backHandler.remove();
  }, [canGoBack]);

  //printing
  const injectedJS = `
    (function() {
      var originalPrint = window.print;
      window.print = function() {
        try {
          var html = document.documentElement.outerHTML;
          window.ReactNativeWebView.postMessage(JSON.stringify({ type: "print", html: html }));
        } catch (e) {
          window.ReactNativeWebView.postMessage(JSON.stringify({ type: "print", error: String(e) }));
        }
      };
    })();
  `;

  const handleMessage = async (event: { nativeEvent: { data: string; }; }) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data?.type === "print" && typeof data.html === "string" && data.html.trim().length > 0) {
        await Print.printAsync({ html: data.html });
        return;
      }
    } catch {
      // Non-JSON message; ignore
    }

    if (event.nativeEvent?.data === "print") {
      await Print.printAsync({ html: "<h1>No HTML captured from page.</h1>" });
    }
  };

  if (Platform.OS === "web") {
    return (
      <iframe
        src="https://zaterp.com/login"
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: "100vw",
          height: "100vh",
          border: "none",
          margin: 0,
          padding: 0,
          overflow: "hidden",
          zIndex: 9999,
        }}
        width="100%"
        height="100%"
        frameBorder="0"
        allowFullScreen
      />
    );
  }

  // Apply top padding only on Android to prevent content from going under status bar
  // On iOS, WebView handles safe areas automatically, so we don't add extra padding
  const paddingTop = Platform.OS === "android" ? insets.top : 0;

  return (
    <View style={{ flex: 1, paddingTop, backgroundColor }}>
      <WebView
        ref={webViewRef}
        source={{ uri: "https://zaterp.com/login" }}
        onNavigationStateChange={(navState) => setCanGoBack(navState.canGoBack)}
        injectedJavaScript={injectedJS}
        onMessage={handleMessage}
        style={{ flex: 1, backgroundColor }}
        containerStyle={{ backgroundColor }}
      />
    </View>
  );
}
