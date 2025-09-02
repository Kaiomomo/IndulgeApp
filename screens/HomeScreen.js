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
  runTransaction,
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
            const unsubscribeGroup = onSnapshot(groupRef, async (snap) => {
              if (snap.exists()) {
                let data = snap.data();

                // 🚽 If toiletStatus missing → initialize
                if (!data.toiletStatus) {
                  await updateDoc(groupRef, {
                    toiletStatus: { current: null, queue: [] },
                  });
                  data = { ...data, toiletStatus: { current: null, queue: [] } };
                }

                // kicked from group
                if (!data.membersUIDs?.includes(currentUser.uid)) {
                  resetToiletState();
                  return;
                }

                setJoinedGroup({ id: snap.id, ...data });

                // Check if I'm inside
                const meInside = data.toiletStatus.current?.uid === currentUser.uid;
                setIsOnToilet(meInside);

                if (meInside && data.toiletStatus.current.expiresAt) {
                  setEndTime(data.toiletStatus.current.expiresAt);
                } else {
                  setEndTime(null);
                  setRemainingTime(0);
                }
              } else {
                resetToiletState();
              }
            });

            return () => unsubscribeGroup();
          } else {
            resetToiletState();
          }
        });

        return () => unsubscribeGroupQuery();
      } else {
        resetToiletState();
      }
    });

    return () => unsubscribeAuth();
  }, []);

  const resetToiletState = () => {
    setJoinedGroup(null);
    setIsOnToilet(false);
    setEndTime(null);
    setRemainingTime(0);
  };

  // 🔹 Toilet timer + progress animation
  useEffect(() => {
    let interval;
    if (isOnToilet && endTime) {
      const remaining = endTime - Date.now();
      progress.value = withTiming(0, {
        duration: remaining,
        easing: Easing.linear,
      });

      interval = setInterval(async () => {
        const left = Math.max(0, endTime - Date.now());
        setRemainingTime(left);

        if (left <= 0) {
          clearInterval(interval);

          if (!joinedGroup || !user) return;
          const groupRef = doc(db, "groups", joinedGroup.id);

          // Use transaction to auto-promote + count
          await runTransaction(db, async (transaction) => {
            const snap = await transaction.get(groupRef);
            if (!snap.exists()) return;
            const data = snap.data();

            let updateData = { toiletStatus: { current: null, queue: [] } };

            if (data.toiletStatus.queue?.length > 0) {
              const [next, ...rest] = data.toiletStatus.queue;
              const newExpiry = Date.now() + 10 * 60 * 1000;
              updateData.toiletStatus = {
                current: { ...next, expiresAt: newExpiry, startedAt: Date.now() },
                queue: rest,
              };
            }

            // increment indulgeCount
            const members = data.members.map((m) =>
              m.uid === user.uid
                ? { ...m, indulgeCount: (m.indulgeCount || 0) + 1 }
                : m
            );

            updateData.members = members;
            transaction.update(groupRef, updateData);
          });

          setIsOnToilet(false);
          setEndTime(null);
          setRemainingTime(0);
        }
      }, 1000);
    } else {
      progress.value = circumference;
      setRemainingTime(0);
    }

    return () => clearInterval(interval);
  }, [isOnToilet, endTime, joinedGroup, user]);

  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: progress.value,
  }));

  const handleToiletToggle = async () => {
    if (!joinedGroup || !user) return;
    const groupRef = doc(db, "groups", joinedGroup.id);

    try {
      if (!isOnToilet) {
        if (joinedGroup.toiletStatus?.current) {
          // Someone inside → join queue
          const alreadyQueued = joinedGroup.toiletStatus.queue?.some(
            (q) => q.uid === user.uid
          );
          if (alreadyQueued) {
            Alert.alert("⏳ You’re already in the queue!");
            return;
          }

          await updateDoc(groupRef, {
            "toiletStatus.queue": arrayUnion({
              uid: user.uid,
              username: user.displayName || "Anonymous",
              timestamp: Date.now(),
            }),
          });

          Alert.alert("🚽 Occupied", "You’ve been added to the queue.");
        } else {
          // Free → enter toilet
          const expiry = Date.now() + 10 * 60 * 1000;
          await updateDoc(groupRef, {
            "toiletStatus.current": {
              uid: user.uid,
              username: user.displayName || "Anonymous",
              expiresAt: expiry,
              startedAt: Date.now(),
            },
          });
        }
      } else {
        // 🚽 Leaving toilet → transaction safe
        await runTransaction(db, async (transaction) => {
          const snap = await transaction.get(groupRef);
          if (!snap.exists()) return;
          const data = snap.data();

          let updateData = { toiletStatus: { current: null, queue: [] } };

          if (data.toiletStatus.queue?.length > 0) {
            const [next, ...rest] = data.toiletStatus.queue;
            const newExpiry = Date.now() + 10 * 60 * 1000;
            updateData.toiletStatus = {
              current: { ...next, expiresAt: newExpiry, startedAt: Date.now() },
              queue: rest,
            };
          }

          // increment indulgeCount
          const members = data.members.map((m) =>
            m.uid === user.uid
              ? { ...m, indulgeCount: (m.indulgeCount || 0) + 1 }
              : m
          );

          updateData.members = members;
          transaction.update(groupRef, updateData);
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

  // 🚽 Toast animation effect
  useEffect(() => {
    if (
      joinedGroup?.toiletStatus?.current ||
      joinedGroup?.toiletStatus?.queue?.length > 0
    ) {
      toastTranslateY.value = withTiming(0, {
        duration: 400,
        easing: Easing.out(Easing.ease),
      });
      toastOpacity.value = withTiming(1, { duration: 400 });
    } else {
      toastTranslateY.value = withTiming(-100, { duration: 300 });
      toastOpacity.value = withTiming(0, { duration: 300 });
    }
  }, [joinedGroup]);

  const toastStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: toastTranslateY.value }],
    opacity: toastOpacity.value,
  }));

  return (
    <LinearGradient colors={["#0f0f0f", "#1a1a1a"]} style={styles.gradient}>
      {/* 🚽 Floating Toilet Alert */}
      <Animated.View style={[styles.toastContainer, toastStyle]}>
        <Text style={styles.toastTitle}>🚽 Toilet Alert</Text>
        {joinedGroup?.toiletStatus?.current && (
          <Text style={styles.toastText}>
            {joinedGroup.toiletStatus.current.username} is in the toilet...
          </Text>
        )}
        {joinedGroup?.toiletStatus?.queue?.length > 0 && (
          <Text style={styles.toastText}>
            ⏳ Next in line: {joinedGroup.toiletStatus.queue[0].username}
          </Text>
        )}
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
                  isOnToilet ? ["#43e97b", "#38f9d7"] : ["#ff416c", "#ff4b2b"]
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
  gradient: { flex: 1 },
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
    shadowColor: "#000",
    shadowOpacity: 0.25,
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
  avatarText: { color: "#fff", fontWeight: "700", fontSize: 16 },
  profileText: { fontSize: 15, fontWeight: "600", color: "#eee" },
  buttonGradient: {
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 22,
    minWidth: 240,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
  },
  buttonText: { color: "#fff", fontSize: 17, fontWeight: "600" },
  toiletButtonGradient: {
    paddingVertical: 16,
    paddingHorizontal: 28,
    borderRadius: 28,
    minWidth: 260,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
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
