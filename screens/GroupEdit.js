// GroupEdit.js
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, FlatList, TouchableOpacity, Alert } from 'react-native';
import { doc, getDoc, updateDoc, arrayRemove, onSnapshot } from 'firebase/firestore';
import { db } from '../FirebaseConfig';
import { getAuth } from 'firebase/auth';
import { Ionicons } from '@expo/vector-icons';

const GroupEdit = ({ route, navigation }) => {
  const { group } = route.params || {};
  const [groupData, setGroupData] = useState(null);
  const [loading, setLoading] = useState(true);

  const auth = getAuth();
  const currentUser = auth.currentUser;

  useEffect(() => {
    if (!group?.id) return;

    const groupRef = doc(db, 'groups', group.id);

    // live updates
    const unsubscribe = onSnapshot(groupRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = { id: snapshot.id, ...snapshot.data() };
        setGroupData(data);

        // 👇 auto-navigate user if kicked
        if (!data.membersUIDs?.includes(currentUser.uid)) {
          Alert.alert("Removed", "You were removed from the group.");
          navigation.navigate('Home');
        }
      } else {
        setGroupData(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [group]);

  // leave group handler
  const handleLeaveGroup = () => {
    Alert.alert(
      'Leave Group',
      'Are you sure you want to leave this group?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Leave',
          style: 'destructive',
          onPress: async () => {
            try {
              const groupRef = doc(db, 'groups', group.id);

              await updateDoc(groupRef, {
                members: arrayRemove({
                  uid: currentUser.uid,
                  username: currentUser.displayName || 'Anonymous',
                }),
                membersUIDs: arrayRemove(currentUser.uid),
              });

              navigation.navigate('Home');
            } catch (error) {
              console.error('Error leaving group:', error);
              Alert.alert('Error', 'Could not leave the group.');
            }
          },
        },
      ]
    );
  };

  // owner kicking a member
  const handleKickMember = (member) => {
    Alert.alert(
      'Kick Member',
      `Remove ${member.username || 'this user'} from the group?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Kick',
          style: 'destructive',
          onPress: async () => {
            try {
              const groupRef = doc(db, 'groups', group.id);

              await updateDoc(groupRef, {
                members: arrayRemove({
                  uid: member.uid,
                  username: member.username || 'Anonymous',
                }),
                membersUIDs: arrayRemove(member.uid),
              });

              // also clean toiletStatus if exists
              if (groupData.toiletStatus) {
                const updatedToiletStatus = groupData.toiletStatus.filter(
                  (u) => u.uid !== member.uid
                );
                await updateDoc(groupRef, { toiletStatus: updatedToiletStatus });
              }

              Alert.alert('Success', `${member.username || 'User'} was removed.`);
            } catch (error) {
              console.error('Error kicking member:', error);
              Alert.alert('Error', 'Could not remove member.');
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#007bff" />
      </View>
    );
  }

  if (!groupData) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>Group not found</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{groupData.name}</Text>
      <Text style={styles.owner}>
        Owner: {groupData.ownerName || 'Unknown'}
      </Text>

      {/* Members List */}
      <FlatList
        data={groupData.members || []}
        keyExtractor={(item, index) => item.uid || index.toString()}
        renderItem={({ item }) => (
          <View style={styles.memberCard}>
            <Text style={styles.memberName}>
              {item.username || 'Anonymous'}
              {item.uid === groupData.ownerId && ' 👑'}
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Ionicons name="person-circle-outline" size={22} color="#007bff" />

              {/* Kick button if owner */}
              {currentUser.uid === groupData.ownerId &&
                item.uid !== groupData.ownerId && (
                  <TouchableOpacity
                    onPress={() => handleKickMember(item)}
                    style={styles.kickButton}
                  >
                    <Text style={styles.kickText}>Kick</Text>
                  </TouchableOpacity>
                )}
            </View>
          </View>
        )}
        ListEmptyComponent={
          <Text style={{ textAlign: 'center', marginTop: 20 }}>
            No members yet
          </Text>
        }
      />

      {/* Leave group button */}
      <TouchableOpacity style={styles.leaveButton} onPress={handleLeaveGroup}>
        <Text style={styles.leaveText}>Leave Group</Text>
      </TouchableOpacity>
    </View>
  );
};

export default GroupEdit;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 20,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
    color: '#333',
  },
  owner: {
    fontSize: 16,
    marginBottom: 20,
    textAlign: 'center',
    color: '#666',
  },
  memberCard: {
    backgroundColor: '#f8f9fa',
    padding: 14,
    borderRadius: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#ddd',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  memberName: {
    fontSize: 18,
    fontWeight: '500',
    color: '#333',
  },
  errorText: {
    fontSize: 18,
    color: 'red',
  },
  leaveButton: {
    backgroundColor: '#dc3545',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 20,
  },
  leaveText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  kickButton: {
    backgroundColor: '#ff4d4d',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginLeft: 10,
  },
  kickText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
});
