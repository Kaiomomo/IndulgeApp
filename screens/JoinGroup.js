import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, StyleSheet, ActivityIndicator } from 'react-native';
import { collection, query, where, getDocs, updateDoc, doc, arrayUnion } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { db } from '../FirebaseConfig'; 

const JoinGroup = () => {
  const auth = getAuth();
  const currentUser = auth.currentUser;

  const [groupCode, setGroupCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [groupData, setGroupData] = useState(null);

  const handleSearchGroup = async () => {
    if (!groupCode.trim()) {
      Alert.alert('Validation', 'Please enter a group code.');
      return;
    }

    setLoading(true);
    try {
      const q = query(collection(db, 'groups'), where('code', '==', groupCode.trim()));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        setGroupData(null);
        Alert.alert('Not Found', 'No group found with that code.');
      } else {
        const groupDoc = querySnapshot.docs[0];
        setGroupData({ id: groupDoc.id, ...groupDoc.data() });
      }
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'Could not search for group.');
    }
    setLoading(false);
  };

  const handleJoinGroup = () => {
    if (!currentUser) {
      Alert.alert('Error', 'You must be logged in to join a group.');
      return;
    }

    Alert.alert(
      'Join Group',
      `Are you sure you want to join "${groupData.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Join', onPress: joinConfirmed }
      ]
    );
  };

  const joinConfirmed = async () => {
    try {
      const groupRef = doc(db, 'groups', groupData.id);
      await updateDoc(groupRef, {
        members: arrayUnion({
          uid: currentUser.uid,
          username: currentUser.displayName || 'Anonymous'
        })
      });
      Alert.alert('Success', `You have joined "${groupData.name}"`);
      setGroupData(null);
      setGroupCode('');
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'Could not join the group.');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Join a Group</Text>
      <TextInput
        style={styles.input}
        placeholder="Enter group code"
        value={groupCode}
        onChangeText={setGroupCode}
      />
      <TouchableOpacity style={styles.button} onPress={handleSearchGroup}>
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Search</Text>}
      </TouchableOpacity>

      {groupData && (
        <View style={styles.groupCard}>
          <Text style={styles.groupName}>{groupData.name}</Text>
          <Text style={styles.groupInfo}>Code: {groupData.code}</Text>
          <TouchableOpacity style={styles.joinButton} onPress={handleJoinGroup}>
            <Text style={styles.joinText}>Join Group</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

export default JoinGroup;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
    padding: 20
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
    color: '#333'
  },
  input: {
    backgroundColor: '#fff',
    padding: 14,
    borderRadius: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#ddd',
    marginBottom: 10
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 20
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16
  },
  groupCard: {
    backgroundColor: '#fff',
    padding: 18,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4
  },
  groupName: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 6
  },
  groupInfo: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12
  },
  joinButton: {
    backgroundColor: '#28A745',
    padding: 12,
    borderRadius: 10,
    alignItems: 'center'
  },
  joinText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16
  }
});
