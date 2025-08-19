import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, StyleSheet, ActivityIndicator, FlatList } from 'react-native';
import { collection, query, where, getDocs, updateDoc, doc, arrayUnion } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { db } from '../FirebaseConfig'; 

const JoinGroup = ({ navigation }) => {
  const auth = getAuth();
  const currentUser = auth.currentUser;

  const [groupCode, setGroupCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [groups, setGroups] = useState([]);
  const [filteredGroups, setFilteredGroups] = useState([]);

  // Fetch all groups on mount
  useEffect(() => {
    const fetchGroups = async () => {
      setLoading(true);
      try {
        const snapshot = await getDocs(collection(db, 'groups'));
        const allGroups = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setGroups(allGroups);
        setFilteredGroups(allGroups); // show all initially
      } catch (error) {
        console.error(error);
        Alert.alert('Error', 'Could not load groups.');
      }
      setLoading(false);
    };

    fetchGroups();
  }, []);

  // Search for a specific group code
  const handleSearchGroup = async () => {
    if (!groupCode.trim()) {
      // Reset to all groups if input is empty
      setFilteredGroups(groups);
      return;
    }

    setLoading(true);
    try {
      const q = query(collection(db, 'groups'), where('code', '==', groupCode.trim()));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        setFilteredGroups([]);
        Alert.alert('Not Found', 'No group found with that code.');
      } else {
        const searchResults = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setFilteredGroups(searchResults);
      }
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'Could not search for group.');
    }
    setLoading(false);
  };

  // Join group with one-group restriction
  const handleJoinGroup = async (group) => {
    if (!currentUser) {
      Alert.alert('Error', 'You must be logged in to join a group.');
      return;
    }

    try {
      // 🔎 Check if user already in a group using membersUIDs
      const q = query(collection(db, 'groups'), where('membersUIDs', 'array-contains', currentUser.uid));
      const snapshot = await getDocs(q);

      if (!snapshot.empty) {
        Alert.alert('Error', 'You are already a member of a group. You cannot join another one.');
        return;
      }

      // ✅ Add user to both members + membersUIDs
      const groupRef = doc(db, 'groups', group.id);
      await updateDoc(groupRef, {
        members: arrayUnion({
          uid: currentUser.uid,
          username: currentUser.displayName || 'Anonymous'
        }),
        membersUIDs: arrayUnion(currentUser.uid)
      });

      navigation.navigate('Home');
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

      {/* Show groups list */}
      <FlatList
        data={filteredGroups}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.groupCard}>
            <Text style={styles.groupName}>{item.name}</Text>
            <Text style={styles.groupInfo}>Code: {item.code}</Text>
            <TouchableOpacity style={styles.joinButton} onPress={() => handleJoinGroup(item)}>
              <Text style={styles.joinText}>Join Group</Text>
            </TouchableOpacity>
          </View>
        )}
        ListEmptyComponent={!loading && <Text style={{ textAlign: 'center', marginTop: 20 }}>No groups found</Text>}
      />
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
    elevation: 4,
    marginBottom: 15
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
