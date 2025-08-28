// HomeScreen.js
import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  Linking,
} from "react-native";
import { onAuthStateChanged } from "firebase/auth";
import {
  collection,
  query,
  where,
  onSnapshot,
  doc,
  updateDoc,
  arrayUnion,
} from "firebase/firestore";
import { auth, db } from "../FirebaseConfig";
import { LinearGradient } from "expo-linear-gradient";
import Svg, { Circle } from "react-native-svg";
import { useRoute } from "@react-navigation/native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  useAnimatedProps,
  Easing,
} from "react-native-reanimated";

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

const HomeScreen = ({ navigation }) => {
  const route = useRoute();
  const [user, setUser] = useState(null);
  const [joinedGroup, setJoinedGroup] = useState(null);
  const [toiletUsers, setToiletUsers] = useState([]);
  const [isOnToilet, setIsOnToilet] = useState(false);
  const [endTime, setEndTime] = useState(null);
  const [remainingTime, setRemainingTime] = useState(0);

  // circle progress
  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  const progress = useSharedValue(circumference);

  // toast animation
  const toastTranslateY = useSharedValue(-100);
  const toastOpacity = useSharedValue(0);

  useEffect(() => {
    if (route.params?.showUsernameAlert) {
      Alert.alert("Please go to profile and enter a username");
      navigation.setParams({ showUsernameAlert: false });
    }
  }, [route.params]);

  // 🔹 Listen to auth + groups
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        await currentUser.reload();
        setUser(auth.currentUser);

        // listen for groups
        const q = query(
          collection(db, "groups"),
          where("membersUIDs", "array-contains", currentUser.uid)
        );

        const unsubscribeGroupQuery = onSnapshot(q, (snapshot) => {
          if (!snapshot.empty) {
            const groupDoc = snapshot.docs[0];
            const groupRef = doc(db, "groups", groupDoc.id);

            // listen to this group
            const unsubscribeGroup = onSnapshot(groupRef, (snap) => {
              if (snap.exists()) {
                const data = snap.data();

                // kicked from group
                if (!data.membersUIDs?.includes(currentUser.uid)) {
                  setJoinedGroup(null);
                  setToiletUsers([]);
                  setIsOnToilet(false);
                  setEndTime(null);
                  setRemainingTime(0);
                  return;
                }

                setJoinedGroup({ id: snap.id, ...data });

                const list = data.toiletStatus || [];
                setToiletUsers(list);

                const me = list.find((u) => u.uid === currentUser.uid);
                if (me) {
                  setIsOnToilet(true);
                  if (me.expiresAt) setEndTime(me.expiresAt);
                } else {
                  setIsOnToilet(false);
                  setEndTime(null);
                  setRemainingTime(0);
                }
              } else {
                // group deleted
                setJoinedGroup(null);
                setToiletUsers([]);
                setIsOnToilet(false);
                setEndTime(null);
                setRemainingTime(0);
              }
            });

            return () => unsubscribeGroup();
          } else {
            // no group
            setJoinedGroup(null);
            setToiletUsers([]);
            setIsOnToilet(false);
            setEndTime(null);
            setRemainingTime(0);
          }
        });

        return () => unsubscribeGroupQuery();
      } else {
        setUser(null);
        setJoinedGroup(null);
        setToiletUsers([]);
        setIsOnToilet(false);
        setEndTime(null);
        setRemainingTime(0);
      }
    });

    return () => unsubscribeAuth();
  }, []);

  // 🔹 Toilet timer + progress animation
  useEffect(() => {
    let interval;
    if (isOnToilet && endTime) {
      const remaining = endTime - Date.now();
      progress.value = withTiming(0, {
        duration: remaining,
        easing: Easing.linear,
      });

      interval = setInterval(() => {
        const left = Math.max(0, endTime - Date.now());
        setRemainingTime(left);

        if (left <= 0) {
          clearInterval(interval);

          (async () => {
            if (!joinedGroup || !user) return;
            const groupRef = doc(db, "groups", joinedGroup.id);
            const updatedList = toiletUsers.filter((u) => u.uid !== user.uid);
            await updateDoc(groupRef, { toiletStatus: updatedList });

            setIsOnToilet(false);
            setEndTime(null);
            setRemainingTime(0);

            Alert.alert(
              "⏳ Time’s Up!",
              "Are you still in the toilet?",
              [
                {
                  text: "No, I’m done ✅",
                  onPress: () => handleToiletToggle(),
                  style: "destructive",
                },
                {
                  text: "Yes, still here 🚽",
                  onPress: async () => {
                    const newExpiry = Date.now() + 10 * 60 * 1000;
                    setEndTime(newExpiry);
                    const groupRef = doc(db, "groups", joinedGroup.id);
                    const updatedList = toiletUsers.map((u) =>
                      u.uid === user.uid ? { ...u, expiresAt: newExpiry } : u
                    );
                    await updateDoc(groupRef, { toiletStatus: updatedList });
                  },
                },
              ],
              { cancelable: false }
            );
          })();
        }
      }, 1000);
    } else {
      progress.value = circumference;
      setRemainingTime(0);
    }

    return () => clearInterval(interval);
  }, [isOnToilet, endTime, joinedGroup, toiletUsers, user]);

  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: progress.value,
  }));

  const handleToiletToggle = async () => {
    if (!joinedGroup || !user) return;
    const groupRef = doc(db, "groups", joinedGroup.id);

    try {
      if (!isOnToilet) {
        if (toiletUsers.length > 0) {
          Alert.alert("🚫 Occupied ");
          return;
        }

        const expiry = Date.now() + 10 * 60 * 1000;
        await updateDoc(groupRef, {
          toiletStatus: arrayUnion({
            uid: user.uid,
            username: user.displayName || "Anonymous",
            status: "inToilet",
            timestamp: Date.now(),
            expiresAt: expiry,
          }),
        });
      } else {
        const updatedList = toiletUsers.filter((u) => u.uid !== user.uid);
        await updateDoc(groupRef, { toiletStatus: updatedList });
      }
    } catch (error) {
      console.error("Error updating toilet status:", error);
    }
  };

  const formatTime = (ms) => {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds < 10 ? "0" : ""}${seconds}`;
  };

  // 🚽 Toast animation effect
  useEffect(() => {
    if (toiletUsers.length > 0) {
      toastTranslateY.value = withTiming(0, {
        duration: 400,
        easing: Easing.out(Easing.ease),
      });
      toastOpacity.value = withTiming(1, { duration: 400 });
    } else {
      toastTranslateY.value = withTiming(-100, { duration: 300 });
      toastOpacity.value = withTiming(0, { duration: 300 });
    }
  }, [toiletUsers]);

  const toastStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: toastTranslateY.value }],
    opacity: toastOpacity.value,
  }));

  return (
    <LinearGradient colors={["#1c1c1e", "#2c2c2e"]} style={styles.gradient}>
      {/* 🚽 Floating Toilet Alert */}
      <Animated.View style={[styles.toastContainer, toastStyle]}>
        <Text style={styles.toastTitle}>🚽 Toilet Alert</Text>
        {toiletUsers.map((u) => (
          <Text key={u.uid} style={styles.toastText}>
            {u.username} is in the toilet...
          </Text>
        ))}
      </Animated.View>

      <ScrollView contentContainerStyle={styles.container}>
        {/* Profile Badge */}
        {user && (
          <TouchableOpacity
            onPress={() => navigation.navigate("Profile")}
            style={styles.profileContainer}
            activeOpacity={0.8}
          >
            <View style={styles.avatarCircle}>
              <Text style={styles.avatarText}>
                {user.displayName
                  ? user.displayName.charAt(0).toUpperCase()
                  : "U"}
              </Text>
            </View>
            <Text style={styles.profileText}>
              {user.displayName || user.email}
            </Text>
          </TouchableOpacity>
        )}

        {/* Group Button */}
        {joinedGroup && (
          <TouchableOpacity
            onPress={() =>
              navigation.navigate("GroupEdit", { group: joinedGroup })
            }
            activeOpacity={0.85}
          >
            <LinearGradient
              colors={["#6a11cb", "#2575fc"]}
              style={styles.buttonGradient}
            >
              <Text style={styles.buttonText}>🏠 {joinedGroup.name}</Text>
            </LinearGradient>
          </TouchableOpacity>
        )}

        {/* Navigation Buttons */}
        <TouchableOpacity
          onPress={() => navigation.navigate("CreateGroup")}
          activeOpacity={0.85}
        >
          <LinearGradient
            colors={["#ff7e5f", "#feb47b"]}
            style={styles.buttonGradient}
          >
            <Text style={styles.buttonText}>➕ Create Group</Text>
          </LinearGradient>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => navigation.navigate("JoinGroup")}
          activeOpacity={0.85}
        >
          <LinearGradient
            colors={["#43cea2", "#185a9d"]}
            style={styles.buttonGradient}
          >
            <Text style={styles.buttonText}>👥 Join Group</Text>
          </LinearGradient>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => navigation.navigate(user ? "Profile" : "SignUp")}
          activeOpacity={0.85}
        >
          <LinearGradient
            colors={["#ff512f", "#dd2476"]}
            style={styles.buttonGradient}
          >
            <Text style={styles.buttonText}>
              {user ? "👤 Profile" : "📝 Sign Up"}
            </Text>
          </LinearGradient>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => Linking.openURL("https://discord.gg/QydjNauSaV")}
          activeOpacity={0.85}
        >
          <LinearGradient
            colors={["#5865F2", "#4752C4"]}
            style={styles.buttonGradient}
          >
            <Text style={styles.buttonText}>💬 Discord</Text>
          </LinearGradient>
        </TouchableOpacity>

        {/* Toilet Timer */}
        {joinedGroup && (
          <View style={{ alignItems: "center" }}>
            <TouchableOpacity onPress={handleToiletToggle} activeOpacity={0.85}>
              <LinearGradient
                colors={
                  isOnToilet
                    ? ["#43e97b", "#38f9d7"]
                    : ["#ff416c", "#ff4b2b"]
                }
                style={styles.toiletButtonGradient}
              >
                <Text style={styles.toiletButtonText}>
                  {isOnToilet ? "✅ Finished" : "💩 Indulge"}
                </Text>
              </LinearGradient>
            </TouchableOpacity>

            {isOnToilet && (
              <View style={{ marginTop: 25, alignItems: "center" }}>
                <Svg height="140" width="140">
                  <Circle
                    cx="70"
                    cy="70"
                    r={radius}
                    stroke="#444"
                    strokeWidth="10"
                    fill="none"
                  />
                  <AnimatedCircle
                    cx="70"
                    cy="70"
                    r={radius}
                    stroke="#4da6ff"
                    strokeWidth="10"
                    strokeDasharray={circumference}
                    animatedProps={animatedProps}
                    fill="none"
                    strokeLinecap="round"
                  />
                  <Text
                    style={{
                      position: "absolute",
                      top: 55,
                      left: 0,
                      right: 0,
                      textAlign: "center",
                      fontSize: 22,
                      fontWeight: "bold",
                      color: "#fff",
                    }}
                  >
                    {formatTime(remainingTime)}
                  </Text>
                </Svg>
              </View>
            )}
          </View>
        )}
      </ScrollView>
    </LinearGradient>
  );
};

export default HomeScreen;

const styles = StyleSheet.create({
  gradient: { flex: 1, backgroundColor: "#1c1c1e" },
  container: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 50,
    gap: 20,
  },
  profileContainer: {
    position: "absolute",
    top: 50,
    right: 20,
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 30,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    shadowColor: "#4da6ff", // subtle glow
    shadowOpacity: 0.45,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  avatarCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#4da6ff",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  avatarText: { color: "#fff", fontWeight: "700", fontSize: 16 },
  profileText: { fontSize: 15, fontWeight: "600", color: "#eee" },
  buttonGradient: {
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 22,
    minWidth: 240,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#4da6ff", // button glow
    shadowOpacity: 0.45,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  buttonText: { color: "#fff", fontSize: 17, fontWeight: "600" },
  toiletButtonGradient: {
    paddingVertical: 16,
    paddingHorizontal: 28,
    borderRadius: 28,
    minWidth: 260,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#43e97b", // glow when active
    shadowOpacity: 0.5,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  toiletButtonText: { color: "#fff", fontSize: 18, fontWeight: "700" },
  toastContainer: {
    position: "absolute",
    top: 40,
    left: 20,
    right: 20,
    padding: 16,
    borderRadius: 18,
    backgroundColor: "#1e1e1e",
    shadowColor: "#000",
    shadowOpacity: 0.35,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    zIndex: 999,
  },
  toastTitle: { fontSize: 16, fontWeight: "700", marginBottom: 6, color: "#fff" },
  toastText: { fontSize: 15, color: "#ccc" },
});