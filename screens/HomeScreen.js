import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../FirebaseConfig';

const HomeScreen = ({ navigation }) => {
  const [user, setUser] = useState(null);

  // Listen for login state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });

    return () => unsubscribe(); // Clean up on unmount
  }, []);

  const handleCreateGroup = () => {
    navigation.navigate('CreateGroup');
  };

  const handleJoinGroup = () => {
    navigation.navigate('JoinGroup');
  };

  const handleAuthButton = () => {
    if (user) {
      navigation.navigate('Profile'); // Make sure Profile screen exists
    } else {
      navigation.navigate('SignUp');
    }
  };

  return (
    <View style={styles.container}>
      {/* Show user info in top-right if logged in */}
      {user && (
        <View style={styles.profileContainer}>
          <Text style={styles.profileText}>
            {user.displayName || user.email}
          </Text>
        </View>
      )}

      <TouchableOpacity style={styles.button} onPress={handleCreateGroup}>
        <Text style={styles.buttonText}>Create Group</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.button} onPress={handleJoinGroup}>
        <Text style={styles.buttonText}>Join Group</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.button} onPress={handleAuthButton}>
        <Text style={styles.buttonText}>
          {user ? 'Profile' : 'Sign Up'}
        </Text>
      </TouchableOpacity>
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
    paddingTop: 80, // makes room for the top-right profile
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
