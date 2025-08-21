import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, query, where, getDocs, doc, updateDoc, arrayUnion, onSnapshot } from 'firebase/firestore';
import { auth, db } from '../FirebaseConfig';
import { LinearGradient } from 'expo-linear-gradient'; // ✅ requires expo-linear-gradient

const HomeScreen = ({ navigation }) => {
  const [user, setUser] = useState(null);
  const [joinedGroup, setJoinedGroup] = useState(null);
  const [toiletUsers, setToiletUsers] = useState([]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);

      if (currentUser) {
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
              setToiletUsers(data.toiletStatus || []);
            }
          });

          return () => unsubGroup();
        } else {
          setJoinedGroup(null);
          setToiletUsers([]);
        }
      }
    });

    return () => unsubscribe();
  }, []);

  const handleToiletPress = async () => {
    if (!joinedGroup || !user) return;

    try {
      const groupRef = doc(db, 'groups', joinedGroup.id);
      await updateDoc(groupRef, {
        toiletStatus: arrayUnion({
          uid: user.uid,
          username: user.displayName || 'Anonymous',
          status: 'inToilet',
          timestamp: Date.now(),
        }),
      });
    } catch (error) {
      console.error('Error updating toilet status:', error);
    }
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

        {joinedGroup && (
          <TouchableOpacity style={styles.toiletButton} onPress={handleToiletPress}>
            <Text style={styles.toiletButtonText}>💩 Toilet Break</Text>
          </TouchableOpacity>
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
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
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
