import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, Alert, ActivityIndicator, Modal, TextInput } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { collection, addDoc, getDocs, query, where, orderBy, deleteDoc, doc } from 'firebase/firestore';
import { db, auth } from '../FirebaseConfig'; 
import { onAuthStateChanged } from 'firebase/auth';

const generateGroupCode = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
};

const CreateGroup = () => {
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);

  const [modalVisible, setModalVisible] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [members, setMembers] = useState('');
  const [groupCode, setGroupCode] = useState('');
  const [currentUser, setCurrentUser] = useState(null);

  // Fetch groups for the current user
  const fetchGroups = async (uid) => {
    if (!uid) return;
    setLoading(true);
    try {
      const q = query(
        collection(db, 'groups'),
        where('ownerId', '==', uid),
        orderBy('createdAt', 'desc')
      );
      const querySnapshot = await getDocs(q);
      const fetchedGroups = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setGroups(fetchedGroups);
    } catch (error) {
      console.error('Error fetching groups: ', error);
      Alert.alert('Error', 'Could not load groups.');
    }
    setLoading(false);
  };

  const openCreateModal = () => {
    if (groups.length >= 3) {
      Alert.alert('Limit Reached', 'You can only create up to 3 groups.');
      return;
    }
    setGroupCode(generateGroupCode());
    setGroupName('');
    setMembers('');
    setModalVisible(true);
  };

  // Delete group
  const handleDeleteGroup = async (groupId) => {
    try { 
      if (!currentUser) {
        throw new Error("User must be signed in to delete groups.");
      }

      const groupRef = doc(db, "groups", groupId);
      await deleteDoc(groupRef);

      console.log("Group deleted");
      fetchGroups(currentUser.uid);
    } catch (error) {
      console.error("Error deleting group:", error);
      Alert.alert("Error", "Could not delete group.");
    }
  };

  // Save group
  const handleSaveGroup = async () => {
    if (!groupName.trim()) {
      Alert.alert('Validation', 'Please enter a group name.');
      return;
    }

    try {
      // check duplicate group name
      const q = query( 
        collection(db,'groups'),
        where('name', "==", groupName.trim())
      );
      const existingGroups = await getDocs(q);

      if (!existingGroups.empty){
        Alert.alert("Duplicate name ", 'Please choose another group name ')
        return;
      }
   
      // Parse additional members from input
      const memberList = members
        .split(',')
        .map(m => m.trim())
        .filter(m => m)
        .map((m, i) => ({
          uid: `manual-${Date.now()}-${i}`,  // dummy UID for non-registered users
          username: m
        }));

      // Add current user (owner) as the first member
      const ownerMember = {
        uid: currentUser.uid,
        username: currentUser.displayName || currentUser.email || "Anonymous"
      };

      const newGroup = {
        code: groupCode,
        name: groupName.trim(),
        members: [ownerMember, ...memberList],   // 👈 include owner
        ownerId: currentUser.uid,
        ownerName: currentUser.displayName || currentUser.email || "Anonymous", // 👈 store owner name
        createdAt: new Date()
      };

      await addDoc(collection(db, 'groups'), newGroup);
      setModalVisible(false);
      fetchGroups(currentUser.uid); // refresh list
    } catch (error) {
      console.error('Error creating group: ', error);
      Alert.alert('Error', 'Could not create group.');
    }
  };

  // Watch auth state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      if (user) {
        fetchGroups(user.uid);
      } else {
        setGroups([]);
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const renderGroupCard = ({ item }) => (
    <View style={styles.card}>
      <Ionicons name="people-circle-outline" size={40} color="#007AFF" />
      <View style={{ flex: 1 }}>
        <Text style={styles.cardTitle}>{item.name || 'Group'}</Text>
        <Text style={styles.cardCode}>{item.code}</Text>
      </View>

      <TouchableOpacity
        style={styles.deleteButton}
        onPress={() =>
          Alert.alert(
            "Delete Group",
            `Are you sure you want to delete "${item.name}"?`,
            [
              { text: "Cancel", style: "cancel" },
              { text: "Delete", style: "destructive", onPress: () => handleDeleteGroup(item.id) }
            ]
          )
        }
      >
        <Ionicons name="trash-outline" size={24} color="#FF3B30" />
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Create Group Button */}
      <TouchableOpacity style={styles.createButton} onPress={openCreateModal}>
        <Ionicons name="add-circle-outline" size={22} color="#fff" />
        <Text style={styles.createButtonText}>Create New Group</Text>
      </TouchableOpacity>

      {/* Groups List */}
      {loading ? (
        <ActivityIndicator size="large" color="#007AFF" style={{ marginTop: 30 }} />
      ) : groups.length === 0 ? (
        <Text style={styles.emptyText}>No groups created yet.</Text>
      ) : (
        <FlatList
          data={groups}
          keyExtractor={(item) => item.id}
          renderItem={renderGroupCard}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Create Group Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Create New Group</Text>
            
            <TextInput
              placeholder="Group Name"
              style={styles.input}
              value={groupName}
              onChangeText={setGroupName}
            />

            <TextInput
              placeholder="Members (comma separated)"
              style={styles.input}
              value={members}
              onChangeText={setMembers}
            />

            <Text style={styles.groupCodeLabel}>Group Code: {groupCode}</Text>

            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.cancelButton} onPress={() => setModalVisible(false)}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveButton} onPress={handleSaveGroup}>
                <Text style={styles.saveButtonText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

export default CreateGroup;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
    padding: 20,
  },
  createButton: {
    flexDirection: 'row',
    backgroundColor: '#007AFF',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    shadowColor: '#007AFF',
    shadowOpacity: 0.3,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
  createButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  emptyText: {
    textAlign: 'center',
    color: '#888',
    marginTop: 30,
    fontSize: 15,
  },
  listContainer: {
    paddingBottom: 20,
  },
  card: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    marginBottom: 15,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#8E8E93',
  },
  cardCode: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111',
    marginTop: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 20,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 5,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 15,
    color: '#111',
  },
  input: {
    backgroundColor: '#F0F0F0',
    borderRadius: 10,
    padding: 10,
    marginBottom: 12,
  },
  groupCodeLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#007AFF',
    marginBottom: 15,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  deleteButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#FDECEC',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelButton: {
    marginRight: 10,
  },
  cancelButtonText: {
    color: '#888',
    fontSize: 16,
  },
  saveButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 10,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
