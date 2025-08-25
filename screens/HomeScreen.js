// HomeScreen.js
import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert } from 'react-native';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, query, where, getDocs, doc, updateDoc, arrayUnion, onSnapshot } from 'firebase/firestore';
import { auth, db } from '../FirebaseConfig';
import { LinearGradient } from 'expo-linear-gradient';
import { Linking } from 'react-native';
// ⬇️ NEW imports for countdown
import Svg, { Circle } from 'react-native-svg';
import Animated, {
  useSharedValue,
  useAnimatedProps,
  withTiming,
  Easing,
} from 'react-native-reanimated';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

const HomeScreen = ({ navigation }) => {
  const [user, setUser] = useState(null);
  const [joinedGroup, setJoinedGroup] = useState(null);
  const [toiletUsers, setToiletUsers] = useState([]);
  const [isOnToilet, setIsOnToilet] = useState(false);
  const [endTime, setEndTime] = useState(null);
  const [remainingTime, setRemainingTime] = useState(0); // ⬅️ new numeric countdown

  // ⏳ SVG circle setup
  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  const progress = useSharedValue(circumference);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        await currentUser.reload();
        setUser(auth.currentUser);

        const q = query(
          collection(db, 'groups'),
          where('members', 'array-contains', {
            uid: currentUser.uid,
            username: currentUser.displayName || 'Anonymous',
          })
        );

        const snapshot = await getDocs(q);
        if (!snapshot.empty) {
          const groupDoc = snapshot.docs[0];
          const groupData = { id: groupDoc.id, ...groupDoc.data() };
          setJoinedGroup(groupData);

          const groupRef = doc(db, 'groups', groupDoc.id);
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

  // ⏳ Animate progress + numeric countdown
  useEffect(() => {
    let interval;
    if (isOnToilet && endTime) {
      const remaining = endTime - Date.now();
      progress.value = withTiming(0, {
        duration: remaining,
        easing: Easing.linear,
      });

      // ⏱ update numeric countdown every second
      interval = setInterval(() => {
        const left = Math.max(0, endTime - Date.now());
        setRemainingTime(left);

        if (left <= 0) {
          clearInterval(interval);

          // 👇 Show alert when timer finishes
          Alert.alert(
            "⏳ Time’s Up!",
            "Are you still in the toilet?",
            [
              {
                text: "No, I’m done ✅",
                onPress: () => handleToiletToggle(true), // finish
                style: "destructive",
              },
              {
                text: "Yes, still here 🚽",
                onPress: () => {
                  // extend 5 minutes
                  const newExpiry = Date.now() + 10 * 60 * 1000;
                  setEndTime(newExpiry);

                  // update in Firestore
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
    const groupRef = doc(db, 'groups', joinedGroup.id);

    try {
      if (!isOnToilet) {
        const expiry = Date.now() + 10 * 60 * 1000; // ⬅️ 10 minutes
        await updateDoc(groupRef, {
          toiletStatus: arrayUnion({
            uid: user.uid,
            username: user.displayName || 'Anonymous',
            status: 'inToilet',
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
      console.error('Error updating toilet status:', error);
    }
  };

  // ⏱ Format countdown (mm:ss)
  const formatTime = (ms) => {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  };

  return (
    <LinearGradient colors={['#e6f0ff', '#ffffff']} style={styles.gradient}>
      <ScrollView contentContainerStyle={styles.container}>
        {user && (
          <View style={styles.profileContainer}>
            <Text style={styles.profileText}>{user.displayName || user.email}</Text>
          </View>
        )}

        {/* 🚽 Toilet Notifications */}
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

        {joinedGroup && (
          <TouchableOpacity
            style={styles.button}
            onPress={() => navigation.navigate('GroupEdit', { group: joinedGroup })}
          >
            <Text style={styles.buttonText}>{joinedGroup.name}</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity style={styles.button} onPress={() => navigation.navigate('CreateGroup')}>
          <Text style={styles.buttonText}>➕ Create Group</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.button} onPress={() => navigation.navigate('JoinGroup')}>
          <Text style={styles.buttonText}>👥 Join Group</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.button} onPress={() => navigation.navigate(user ? 'Profile' : 'SignUp')}>
          <Text style={styles.buttonText}>{user ? '👤 Profile' : '📝 Sign Up'}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.discord} onPress={() => Linking.openURL ("https://discord.gg/QydjNauSaV")}>
          <Text style={styles.buttonText}>💬 Discord</Text> 
        </TouchableOpacity>

        {/* 🚽 Toilet Toggle Button with Countdown */}
        {joinedGroup && (
          <View style={{ alignItems: 'center' }}>
            <TouchableOpacity
              style={[styles.toiletButton, isOnToilet && styles.finishedButton]}
              onPress={() => handleToiletToggle()}
            >
              <Text style={styles.toiletButtonText}>
                {isOnToilet ? '✅ Finished' : '💩 Indulge'}
              </Text>
            </TouchableOpacity>

            {isOnToilet && (
              <View style={{ marginTop: 20, alignItems: 'center' }}>
                <Svg height="120" width="120">
                  <Circle
                    cx="60"
                    cy="60"
                    r={radius}
                    stroke="#ddd"
                    strokeWidth="8"
                    fill="none"
                  />
                  <AnimatedCircle
                    cx="60"
                    cy="60"
                    r={radius}
                    stroke="#4CAF50"
                    strokeWidth="8"
                    strokeDasharray={circumference}
                    animatedProps={animatedProps}
                    fill="none"
                    strokeLinecap="round"
                  />
                  <Text
                    style={{
                      position: 'absolute',
                      top: 45,
                      left: 0,
                      right: 0,
                      textAlign: 'center',
                      fontSize: 20,
                      fontWeight: 'bold',
                      color: '#333',
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
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
    gap: 20,
  },
  profileContainer: {
    position: 'absolute',
    top: 50,
    right: 20,
    backgroundColor: '#ffffffcc',
    padding: 10,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  profileText: {
    fontSize: 15,
    color: '#333',
    fontWeight: '600',
  },

  discord:{
     backgroundColor: '#5865F2',
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 16,
    minWidth: 240,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
  },
  button: {
    backgroundColor: '#4da6ff',
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 16,
    minWidth: 240,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
  },
  buttonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '600',
  },
  toiletButton: {
    backgroundColor: '#ff6666',
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 20,
    minWidth: 240,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
  },
  finishedButton: {
    backgroundColor: '#4CAF50',
  },
  toiletButtonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
  },
  toiletBanner: {
    backgroundColor: '#fff8e6',
    borderLeftWidth: 5,
    borderLeftColor: '#ffcc00',
    padding: 16,
    borderRadius: 16,
    marginBottom: 20,
    width: '90%',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  toiletBannerTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 6,
    color: '#444',
  },
  toiletText: {
    fontSize: 15,
    color: '#555',
  },
});
