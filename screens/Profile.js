import React, { useEffect, useState } from 'react';
import { View, Text, Alert, TextInput, TouchableOpacity, StyleSheet, Modal } from 'react-native';
import { auth } from '../FirebaseConfig';
import { 
  onAuthStateChanged, 
  signOut, 
  updateProfile, 
  sendPasswordResetEmail, 
  deleteUser,
  reauthenticateWithCredential,
  EmailAuthProvider
} from 'firebase/auth';
import Ionicons from 'react-native-vector-icons/Ionicons';

const Profile = ({ navigation }) => {
  const [user, setUser] = useState(null);
  const [newUsername, setNewUsername] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [resetEmail, setResetEmail] = useState('');

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteEmail, setDeleteEmail] = useState('');
  const [deletePassword, setDeletePassword] = useState('');

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (currentUser?.displayName) {
        setNewUsername(currentUser.displayName);
      }
      if (currentUser?.email) {
        setResetEmail(currentUser.email); // prefill with logged-in email
        setDeleteEmail(currentUser.email); // also prefill delete email
      }
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

  const handleSaveUsername = async () => {
    if (!newUsername.trim()) {
      Alert.alert('Error', 'Username cannot be empty.');
      return;
    }
    try {
      await updateProfile(auth.currentUser, { displayName: newUsername });
      await auth.currentUser.reload();
      const updatedUser = auth.currentUser;
      navigation.navigate('Home', { updatedName: updatedUser.displayName });
      Alert.alert('Success', 'Username updated successfully!');
      setIsEditing(false);
    } catch (error) {
      Alert.alert('Error', error.message);
    }
  };

  const handlePasswordReset = async () => {
    if (!resetEmail.trim()) {
      Alert.alert('Error', 'Please enter your email.');
      return;
    }
    try {
      await sendPasswordResetEmail(auth, resetEmail);
      Alert.alert('Success', 'Password reset email sent! Please check your inbox.');
    } catch (error) {
      Alert.alert('Error', error.message);
    }
  };

  const confirmDeleteAccount = async () => {
    if (!deleteEmail.trim() || !deletePassword.trim()) {
      Alert.alert('Error', 'Please enter both email and password.');
      return;
    }
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) throw new Error('No user logged in.');

      const credential = EmailAuthProvider.credential(deleteEmail, deletePassword);
      await reauthenticateWithCredential(currentUser, credential);

      await deleteUser(currentUser);
      Alert.alert('Account Deleted', 'Your account has been deleted successfully.');
      setShowDeleteModal(false);
      navigation.navigate('Home');
    } catch (error) {
      Alert.alert('Error', error.message);
    }
  };

  return (
    <View style={styles.container}>
      {/* Profile Icon */}
      <View style={styles.iconHeader}>
        <Ionicons name="person-circle-outline" size={90} color="#007AFF" />
      </View>

      {user ? (
        <>
          {/* Profile Card */}
          <View style={styles.card}>
            <Text style={styles.label}>Email:</Text>
            <Text style={styles.value}>{user.email}</Text>

            {isEditing ? (
              <>
                <Text style={[styles.label, { marginTop: 15 }]}>Username:</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter new username"
                  placeholderTextColor="#888"
                  value={newUsername}
                  onChangeText={setNewUsername}
                />
                <View style={styles.buttonRow}>
                  <TouchableOpacity style={styles.primaryButtonRow} onPress={handleSaveUsername}>
                    <Text style={styles.primaryText}>Save</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.secondaryButtonRow} onPress={() => setIsEditing(false)}>
                    <Text style={styles.secondaryText}>Cancel</Text>
                  </TouchableOpacity>
                </View>
              </>
            ) : (
              <>
                <Text style={[styles.label, { marginTop: 15 }]}>Username:</Text>
                <Text style={styles.value}>{user.displayName || 'Not set'}</Text>
                <TouchableOpacity style={styles.primaryButton} onPress={() => setIsEditing(true)}>
                  <Text style={styles.primaryText}>Edit Username</Text>
                </TouchableOpacity>
              </>
            )}
          </View>

          {/* Change Password Card */}
          <View style={styles.card}>
            <Text style={styles.label}>Change Password</Text>
            <Text style={styles.description}>
              Enter your email to receive a password reset link.
            </Text>
            <TextInput
              style={styles.input}
              placeholder="Enter your email"
              placeholderTextColor="#888"
              value={resetEmail}
              onChangeText={setResetEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
            <TouchableOpacity style={styles.primaryButton} onPress={handlePasswordReset}>
              <Text style={styles.primaryText}>Send Reset Email</Text>
            </TouchableOpacity>
          </View>
        </>
      ) : (
        <Text style={styles.email}>No user logged in.</Text>
      )}

      {/* Log Out Button */}
      <TouchableOpacity style={styles.destructiveButton} onPress={handleLogout}>
        <Text style={styles.destructiveText}>Log Out</Text>
      </TouchableOpacity>

      {/* Delete Account Button */}
      <TouchableOpacity style={styles.deleteButton} onPress={() => setShowDeleteModal(true)}>
        <Text style={styles.deleteText}>Delete Account</Text>
      </TouchableOpacity>

      {/* Delete Confirmation Modal */}
      <Modal
        visible={showDeleteModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowDeleteModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>Confirm Account Deletion</Text>
            <TextInput
              style={styles.input}
              placeholder="Email"
              placeholderTextColor="#888"
              value={deleteEmail}
              onChangeText={setDeleteEmail}
              autoCapitalize="none"
              keyboardType="email-address"
            />
            <TextInput
              style={styles.input}
              placeholder="Password"
              placeholderTextColor="#888"
              value={deletePassword}
              onChangeText={setDeletePassword}
              secureTextEntry
            />
            <View style={styles.buttonRow}>
              <TouchableOpacity style={styles.primaryButtonRow} onPress={confirmDeleteAccount}>
                <Text style={styles.primaryText}>Delete</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.secondaryButtonRow} onPress={() => setShowDeleteModal(false)}>
                <Text style={styles.secondaryText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

export default Profile;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    backgroundColor: '#FFFFFF',
  },
  card: {
    backgroundColor: '#F9F9F9',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    minHeight: 140,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#8E8E93',
    marginBottom: 4,
  },
  value: {
    fontSize: 18,
    fontWeight: '500',
    color: '#111',
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    color: '#666',
    marginBottom: 10,
  },
  input: {
    backgroundColor: '#F2F2F7',
    padding: 14,
    borderRadius: 12,
    fontSize: 16,
    marginBottom: 12,
    color: '#000',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 10,
  },
  primaryButtonRow: {
    flex: 1,
    backgroundColor: '#FF3B30',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  secondaryButtonRow: {
    flex: 1,
    backgroundColor: '#EFEFF4',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  primaryButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 12,
    alignItems: 'center',
    alignSelf: 'flex-start',
    marginTop: 10,
  },
  primaryText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 15,
  },
  secondaryText: {
    color: '#007AFF',
    fontWeight: '600',
    fontSize: 15,
  },
  destructiveButton: {
    marginTop: 30,
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 12,
    alignItems: 'center',
    alignSelf: 'center',
    backgroundColor: '#FF9500',
  },
  destructiveText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 15,
  },
  deleteButton: {
    marginTop: 12,
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 12,
    alignItems: 'center',
    alignSelf: 'center',
    backgroundColor: '#FF3B30',
  },
  deleteText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 15,
  },
  iconHeader: {
    alignItems: 'center',
    marginBottom: 24,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 16,
    width: '90%',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 15,
    textAlign: 'center',
  },
});
