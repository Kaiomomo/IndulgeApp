// HomeScreen.js
import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
} from "react-native";
import { onAuthStateChanged } from "firebase/auth";
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  updateDoc,
  arrayUnion,
  onSnapshot,
} from "firebase/firestore";
import { auth, db } from "../FirebaseConfig";
import { LinearGradient } from "expo-linear-gradient";
import { Linking } from "react-native";
import Svg, { Circle } from "react-native-svg";
import { useRoute } from "@react-navigation/native";
import Animated, {
  useSharedValue,
  useAnimatedProps,
  withTiming,
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

  useEffect(() => {
    if (route.params?.showUsernameAlert) {
      Alert.alert("Please go to profile and enter a username");
      navigation.setParams({ showUsernameAlert: false });
    }
  }, [route.params]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        await currentUser.reload();
        setUser(auth.currentUser);

        const q = query(
          collection(db, "groups"),
          where("membersUIDs", "array-contains", currentUser.uid)
        );

        const snapshot = await getDocs(q);
        if (!snapshot.empty) {
          const groupDoc = snapshot.docs[0];
          const groupData = { id: groupDoc.id, ...groupDoc.data() };
          setJoinedGroup(groupData);

          const groupRef = doc(db, "groups", groupDoc.id);
          const unsubGroup = onSnapshot(groupRef, (snap) => {
            if (snap.exists()) {
              const data = snap.data();
              const list = data.toiletStatus || [];
              setToiletUsers(list);

              const me = list.find((u) => u.uid === currentUser.uid);
              if (me) {
                setIsOnToilet(true);
                if (me.expiresAt) {
                  setEndTime(me.expiresAt);
                }
              } else {
                setIsOnToilet(false);
                setEndTime(null);
                setRemainingTime(0);
              }
            }
          });

          return () => unsubGroup();
        } else {
          setJoinedGroup(null);
          setToiletUsers([]);
          setIsOnToilet(false);
          setEndTime(null);
          setRemainingTime(0);
        }
      } else {
        setUser(null);
        setJoinedGroup(null);
        setToiletUsers([]);
        setIsOnToilet(false);
        setEndTime(null);
        setRemainingTime(0);
      }
    });

    return () => unsubscribe();
  }, []);

  // timer + animation
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
          Alert.alert(
            "⏳ Time’s Up!",
            "Are you still in the toilet?",
            [
              {
                text: "No, I’m done ✅",
                onPress: () => handleToiletToggle(true),
                style: "destructive",
              },
              {
                text: "Yes, still here 🚽",
                onPress: () => {
                  const newExpiry = Date.now() + 10 * 60 * 1000;
                  setEndTime(newExpiry);
                  const groupRef = doc(db, "groups", joinedGroup.id);
                  const updatedList = toiletUsers.map((u) =>
                    u.uid === user.uid ? { ...u, expiresAt: newExpiry } : u
                  );
                  updateDoc(groupRef, { toiletStatus: updatedList });
                },
              },
            ],
            { cancelable: false }
          );
        }
      }, 1000);
    } else {
      progress.value = circumference;
      setRemainingTime(0);
    }

    return () => clearInterval(interval);
  }, [isOnToilet, endTime]);

  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: progress.value,
  }));

  const handleToiletToggle = async (auto = false) => {
    if (!joinedGroup || !user) return;
    const groupRef = doc(db, "groups", joinedGroup.id);

    try {
      if (!isOnToilet) {
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
        await updateDoc(groupRef, {
          toiletStatus: updatedList,
        });
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

  return (
    <LinearGradient colors={["#e6f0ff", "#ffffff"]} style={styles.gradient}>
      <ScrollView contentContainerStyle={styles.container}>
        {/* Profile Badge */}
        {user && (
          <View style={styles.profileContainer}>
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
          </View>
        )}

        {/* Toilet Alert Banner */}
        {toiletUsers.length > 0 && (
          <View style={styles.toiletBanner}>
            <Text style={styles.toiletBannerTitle}>🚽 Toilet Alert</Text>
            {toiletUsers.map((u) => (
              <Text key={u.uid} style={styles.toiletText}>
                {u.username} is in the toilet...
              </Text>
            ))}
          </View>
        )}

        {/* Buttons */}
        {joinedGroup && (
          <TouchableOpacity
            style={styles.button}
            onPress={() =>
              navigation.navigate("GroupEdit", { group: joinedGroup })
            }
          >
            <Text style={styles.buttonText}>🏠 {joinedGroup.name}</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={styles.button}
          onPress={() => navigation.navigate("CreateGroup")}
        >
          <Text style={styles.buttonText}>➕ Create Group</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.button}
          onPress={() => navigation.navigate("JoinGroup")}
        >
          <Text style={styles.buttonText}>👥 Join Group</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.button}
          onPress={() =>
            navigation.navigate(user ? "Profile" : "SignUp")
          }
        >
          <Text style={styles.buttonText}>
            {user ? "👤 Profile" : "📝 Sign Up"}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.discord}
          onPress={() => Linking.openURL("https://discord.gg/QydjNauSaV")}
        >
          <Text style={styles.buttonText}>💬 Discord</Text>
        </TouchableOpacity>

        {/* Toilet Timer */}
        {joinedGroup && (
          <View style={{ alignItems: "center" }}>
            <TouchableOpacity
              style={[styles.toiletButton, isOnToilet && styles.finishedButton]}
              onPress={() => handleToiletToggle()}
            >
              <Text style={styles.toiletButtonText}>
                {isOnToilet ? "✅ Finished" : "💩 Indulge"}
              </Text>
            </TouchableOpacity>

            {isOnToilet && (
              <View style={{ marginTop: 25, alignItems: "center" }}>
                <Svg height="140" width="140">
                  <Circle
                    cx="70"
                    cy="70"
                    r={radius}
                    stroke="#eee"
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
                      color: "#333",
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
  gradient: {
    flex: 1,
  },
  container: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 50,
    gap: 20,
  },
  // profile badge
  profileContainer: {
    position: "absolute",
    top: 50,
    right: 20,
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 30,
    backgroundColor: "rgba(255, 255, 255, 0.75)",
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
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
  avatarText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 16,
  },
  profileText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#333",
  },
  // buttons
  button: {
    backgroundColor: "#4da6ff",
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 20,
    minWidth: 240,
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
  },
  discord: {
    backgroundColor: "#5865F2",
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 20,
    minWidth: 240,
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
  },
  buttonText: {
    color: "#fff",
    fontSize: 17,
    fontWeight: "600",
  },
  // toilet stuff
  toiletButton: {
    backgroundColor: "#ff6666",
    paddingVertical: 16,
    paddingHorizontal: 28,
    borderRadius: 25,
    minWidth: 240,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
  },
  finishedButton: {
    backgroundColor: "#4CAF50",
  },
  toiletButtonText: {
    color: "#fff",
    fontSize: 17,
    fontWeight: "700",
  },
  toiletBanner: {
    backgroundColor: "#fff",
    borderLeftWidth: 5,
    borderLeftColor: "#ffcc00",
    padding: 16,
    borderRadius: 18,
    marginBottom: 20,
    width: "90%",
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  toiletBannerTitle: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 6,
    color: "#444",
  },
  toiletText: {
    fontSize: 15,
    color: "#555",
  },
});
