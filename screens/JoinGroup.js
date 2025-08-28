import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, StyleSheet, ActivityIndicator, FlatList } from 'react-native';
import { collection, query, where, getDocs, updateDoc, doc, arrayUnion } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { db } from '../FirebaseConfig'; 
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';

const JoinGroup = ({ navigation }) => {
  const auth = getAuth();
  const currentUser = auth.currentUser;

  const [groupCode, setGroupCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [groups, setGroups] = useState([]);
  const [filteredGroups, setFilteredGroups] = useState([]);

  useEffect(() => {
    const fetchGroups = async () => {
      setLoading(true);
      try {
        const snapshot = await getDocs(collection(db, 'groups'));
        const allGroups = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setGroups(allGroups);
        setFilteredGroups(allGroups);
      } catch (error) {
        console.error(error);
        Alert.alert('Error', 'Could not load groups.');
      }
      setLoading(false);
    };
    fetchGroups();
  }, []);

  const handleSearchGroup = async () => {
    if (!groupCode.trim()) {
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

  const handleJoinGroup = async (group) => {
    if (!currentUser) {
      Alert.alert('Error', 'You must be logged in to join a group.');
      return;
    }

    try {
      const q = query(collection(db, 'groups'), where('membersUIDs', 'array-contains', currentUser.uid));
      const snapshot = await getDocs(q);

      if (!snapshot.empty) {
        Alert.alert('Error', 'You are already a member of a group.');
        return;
      }

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
    <LinearGradient colors={["#43cea2", "#185a9d"]} style={styles.gradient}>
      <View style={styles.container}>
        <Text style={styles.title}>Join a Group</Text>

        {/* Glass input */}
        <BlurView intensity={90} tint="light" style={styles.inputWrapper}>
          <TextInput
            style={styles.input}
            placeholder="Enter group code"
            placeholderTextColor="rgba(255,255,255,0.7)"
            value={groupCode}
            onChangeText={setGroupCode}
          />
        </BlurView>

        {/* Glass button */}
        <BlurView intensity={90} tint="light" style={styles.buttonWrapper}>
          <TouchableOpacity style={styles.button} onPress={handleSearchGroup}>
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Search</Text>
            )}
          </TouchableOpacity>
        </BlurView>

        <FlatList
          data={filteredGroups}
          keyExtractor={(item, index) => `${item.id}-${index}`}
          renderItem={({ item }) => (
            <BlurView intensity={90} tint="light" style={styles.groupCard}>
              <Text style={styles.groupName}>{item.name}</Text>
              <Text style={styles.groupInfo}>Code: {item.code}</Text>
              <TouchableOpacity style={styles.joinButton} onPress={() => handleJoinGroup(item)}>
                <Text style={styles.joinText}>Join Group</Text>
              </TouchableOpacity>
            </BlurView>
          )}
          ListEmptyComponent={!loading && <Text style={styles.noGroups}>No groups found</Text>}
        />
      </View>
    </LinearGradient>
  );
};

export default JoinGroup;

const styles = StyleSheet.create({
  gradient: {
    flex: 1
  },
  container: {
    flex: 1,
    padding: 20,
  },
  title: { 
    fontSize: 28, 
    fontWeight: 'bold', 
    marginBottom: 20, 
    textAlign: 'center', 
    color: '#fff',
    letterSpacing: 1,
  },
  // Glass input
  inputWrapper: {
    borderRadius: 14,
    marginBottom: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  input: { 
    padding: 14, 
    fontSize: 16, 
    color: '#fff'
  },
  // Glass button
  buttonWrapper: {
    borderRadius: 14,
    marginBottom: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  button: { 
    padding: 14, 
    alignItems: 'center',
  },
  buttonText: { 
    color: '#fff', 
    fontWeight: 'bold', 
    fontSize: 16 
  },
  // Glass group cards
  groupCard: { 
    padding: 18, 
    borderRadius: 18,
    marginBottom: 15,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  groupName: { 
    fontSize: 20, 
    fontWeight: 'bold', 
    marginBottom: 6, 
    color: '#fff' 
  },
  groupInfo: { 
    fontSize: 14, 
    color: 'rgba(255,255,255,0.8)', 
    marginBottom: 12 
  },
  joinButton: { 
    backgroundColor: 'rgba(40,167,69,0.8)', 
    padding: 12, 
    borderRadius: 10, 
    alignItems: 'center' 
  },
  joinText: { 
    color: '#fff', 
    fontWeight: 'bold', 
    fontSize: 16 
  },
  noGroups: { 
    textAlign: 'center', 
    marginTop: 20, 
    color: '#fff', 
    fontSize: 16 
  }
});