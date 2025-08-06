import React, { useEffect, useState } from 'react';
import { View, Text, Button, StyleSheet, Alert } from 'react-native';
import { auth } from '../FirebaseConfig';
import { onAuthStateChanged, signOut } from 'firebase/auth';

const Profile = ({ navigation }) => {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });

    return () => unsubscribe();
  }, []);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      Alert.alert('Logged Out', 'You have been signed out.');
      navigation.navigate('Home');
    } catch (error) {
      Alert.alert('Error', error.message);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Profile</Text>

      {user ? (
        <Text style={styles.email}>Email: {user.email}</Text>
      ) : (
        <Text style={styles.email}>No user logged in.</Text>
      )}

      <View style={styles.logoutButton}>
        <Button title="Log Out" onPress={handleLogout} />
      </View>
    </View>
  );
};

export default Profile;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 28,
    marginBottom: 20,
    fontWeight: 'bold',
  },
  email: {
    fontSize: 18,
    marginBottom: 30,
  },
  logoutButton: {
    marginTop: 10,
    width: '60%',
  },
});
