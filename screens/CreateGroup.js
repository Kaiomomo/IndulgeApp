import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Alert,
  ActivityIndicator,
  Modal,
  TextInput,
} from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";
import { LinearGradient } from 'expo-linear-gradient';
import {
  collection,
  addDoc,
  getDocs,
  query,
  where,
  orderBy,
  deleteDoc,
  doc,
} from "firebase/firestore";
import { db, auth } from "../FirebaseConfig";
import { onAuthStateChanged } from "firebase/auth";

const generateGroupCode = () => {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  return Array.from({ length: 6 }, () =>
    chars[Math.floor(Math.random() * chars.length)]
  ).join("");
};

const CreateGroup = () => {
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [members, setMembers] = useState("");
  const [groupCode, setGroupCode] = useState("");
  const [currentUser, setCurrentUser] = useState(null);

  const fetchGroups = async (uid) => {
    if (!uid) return;
    setLoading(true);
    try {
      const q = query(
        collection(db, "groups"),
        where("ownerId", "==", uid),
        orderBy("createdAt", "desc")
      );
      const querySnapshot = await getDocs(q);
      const fetchedGroups = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setGroups(fetchedGroups);
    } catch (error) {
      console.error("Error fetching groups: ", error);
      Alert.alert("Error", "Could not load groups.");
    }
    setLoading(false);
  };

  const openCreateModal = () => {
    if (groups.length >= 3) {
      Alert.alert("Limit Reached", "You can only create up to 3 groups.");
      return;
    }
    setGroupCode(generateGroupCode());
    setGroupName("");
    setMembers("");
    setModalVisible(true);
  };

  const handleDeleteGroup = async (groupId) => {
    try {
      if (!currentUser) throw new Error("User must be signed in to delete groups.");
      const groupRef = doc(db, "groups", groupId);
      await deleteDoc(groupRef);
      fetchGroups(currentUser.uid);
    } catch (error) {
      console.error("Error deleting group:", error);
      Alert.alert("Error", "Could not delete group.");
    }
  };

  const handleSaveGroup = async () => {
    if (!groupName.trim()) {
      Alert.alert("Validation", "Please enter a group name.");
      return;
    }

    try {
      const q = query(
        collection(db, "groups"),
        where("name", "==", groupName.trim())
      );
      const existingGroups = await getDocs(q);
      if (!existingGroups.empty) {
        Alert.alert("Duplicate name", "Please choose another group name");
        return;
      }

      const memberList = members
        .split(",")
        .map((m) => m.trim())
        .filter((m) => m)
        .map((m, i) => ({
          uid: `manual-${Date.now()}-${i}`,
          username: m,
        }));

      const ownerMember = {
        uid: currentUser.uid,
        username: currentUser.displayName || currentUser.email || "Anonymous",
      };

      const newGroup = {
        code: groupCode,
        name: groupName.trim(),
        members: [ownerMember, ...memberList],
        ownerId: currentUser.uid,
        ownerName:
          currentUser.displayName || currentUser.email || "Anonymous",
        createdAt: new Date(),
      };

      await addDoc(collection(db, "groups"), newGroup);
      setModalVisible(false);
      fetchGroups(currentUser.uid);
    } catch (error) {
      console.error("Error creating group: ", error);
      Alert.alert("Error", "Could not create group.");
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      if (user) fetchGroups(user.uid);
      else {
        setGroups([]);
        setLoading(false);
      }
    });
    return () => unsubscribe();
  }, []);

  const renderGroupCard = ({ item }) => (
    <View style={styles.card}>
      <Ionicons name="people-circle-outline" size={40} color="#ff7e5f" />
      <View style={{ flex: 1, marginLeft: 12 }}>
        <Text style={styles.cardTitle}>{item.name || "Group"}</Text>
        <Text style={styles.cardCode}>{item.code}</Text>
      </View>
      <TouchableOpacity
        style={styles.deleteButton}
        onPress={() =>
          Alert.alert("Delete Group", `Delete "${item.name}"?`, [
            { text: "Cancel", style: "cancel" },
            { text: "Delete", style: "destructive", onPress: () => handleDeleteGroup(item.id) },
          ])
        }
      >
        <Ionicons name="trash-outline" size={22} color="#fff" />
      </TouchableOpacity>
    </View>
  );

  return (
    <LinearGradient colors={["#ff7e5f", "#feb47b"]} style={styles.container}>
      <TouchableOpacity style={styles.createButton} onPress={openCreateModal}>
        <Ionicons name="add-circle" size={22} color="#fff" />
        <Text style={styles.createButtonText}>Create Group</Text>
      </TouchableOpacity>

      {loading ? (
        <ActivityIndicator size="large" color="#fff" style={{ marginTop: 30 }} />
      ) : groups.length === 0 ? (
        <Text style={styles.emptyText}>No groups yet. Create your first one!</Text>
      ) : (
        <FlatList
          data={groups}
          keyExtractor={(item) => item.id}
          renderItem={renderGroupCard}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
        />
      )}

      <Modal visible={modalVisible} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>New Group</Text>

            <TextInput
              placeholder="Group Name"
              placeholderTextColor="#999"
              style={styles.input}
              value={groupName}
              onChangeText={setGroupName}
            />

            <TextInput
              placeholder="Members (comma separated)"
              placeholderTextColor="#999"
              style={styles.input}
              value={members}
              onChangeText={setMembers}
            />

            <Text style={styles.groupCodeLabel}>Group Code: {groupCode}</Text>

            <View style={styles.modalButtons}>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveButton} onPress={handleSaveGroup}>
                <Text style={styles.saveButtonText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </LinearGradient>
  );
};

export default CreateGroup;

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20 },
  createButton: {
    flexDirection: "row",
    backgroundColor: "rgba(255,255,255,0.25)",
    paddingVertical: 14,
    borderRadius: 30,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
    backdropFilter: "blur(10px)",
  },
  createButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
    marginLeft: 8,
  },
  emptyText: {
    textAlign: "center",
    color: "#fff",
    marginTop: 40,
    fontSize: 16,
    fontWeight: "500",
  },
  listContainer: { paddingBottom: 20 },
  card: {
    flexDirection: "row",
    backgroundColor: "rgba(255,255,255,0.15)",
    borderRadius: 18,
    padding: 18,
    marginBottom: 15,
    alignItems: "center",
  },
  cardTitle: { fontSize: 16, fontWeight: "700", color: "#fff" },
  cardCode: { fontSize: 18, fontWeight: "600", color: "#fff", marginTop: 4 },
  deleteButton: {
    padding: 10,
    borderRadius: 50,
    backgroundColor: "rgba(255,0,0,0.7)",
    marginLeft: 10,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    width: "90%",
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "800",
    marginBottom: 15,
    textAlign: "center",
    color: "#333",
  },
  input: {
    backgroundColor: "#f2f2f2",
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    fontSize: 15,
    color: "#111",
  },
  groupCodeLabel: {
    fontSize: 15,
    fontWeight: "600",
    color: "#ff7e5f",
    marginBottom: 15,
    textAlign: "center",
  },
  modalButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 10,
  },
  cancelButtonText: {
    fontSize: 16,
    color: "#777",
    fontWeight: "600",
  },
  saveButton: {
    backgroundColor: "#ff7e5f",
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: 12,
  },
  saveButtonText: { color: "#fff", fontWeight: "700", fontSize: 16 },
});