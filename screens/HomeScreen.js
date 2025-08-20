import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { auth, db } from '../FirebaseConfig';

const HomeScreen = ({ navigation }) => {
  const [user, setUser] = useState(null);
  const [joinedGroup, setJoinedGroup] = useState(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);

      if (currentUser) {
        // Check if user is in any group
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
          setJoinedGroup({ id: groupDoc.id, ...groupDoc.data() });
        } else {
          setJoinedGroup(null);
        }
      }
    });

    return () => unsubscribe();
  }, []);

  const handleCreateGroup = () => navigation.navigate('CreateGroup');

  const handleJoinGroup = () => navigation.navigate('JoinGroup');

  const handleAuthButton = () => {
    if (user) {
      navigation.navigate('Profile');
    } else {
      navigation.navigate('SignUp');
    }
  };

  return (
    <View style={styles.container}>
      {user && (
        <View style={styles.profileContainer}>
          <Text style={styles.profileText}>{user.displayName || user.email}</Text>
        </View>
      )}

      {/* Button with the name of the group the user joined */}
      {joinedGroup && (
        <TouchableOpacity style={styles.button} onPress={() => navigation.navigate('GroupEdit',{group: joinedGroup})}>
          <Text style={styles.buttonText}>{joinedGroup.name}</Text>
        </TouchableOpacity>
      )}

      <TouchableOpacity style={styles.button} onPress={handleCreateGroup}>
        <Text style={styles.buttonText}>Create Group</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.button} onPress={handleJoinGroup}>
        <Text style={styles.buttonText}>Join Group</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.button} onPress={handleAuthButton}>
        <Text style={styles.buttonText}>{user ? 'Profile' : 'Sign Up'}</Text>
      </TouchableOpacity>

      {/* Below-buttons 💩 button */}
      {joinedGroup && (
        <TouchableOpacity style={styles.button} onPress={() => {}}>
          <Text style={styles.buttonText}>💩</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

export default HomeScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
    gap: 20,
    paddingTop: 80,
  },
  profileContainer: {
    position: 'absolute',
    top: 40,
    right: 20,
    backgroundColor: '#f0f0f0',
    padding: 8,
    borderRadius: 8,
  },
  profileText: {
    fontSize: 14,
    color: '#333',
    fontWeight: 'bold',
  },
  button: {
    backgroundColor: '#007bff',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    minWidth: 200,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
  },
});
