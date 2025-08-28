// GroupEdit.js
import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  FlatList,
  TouchableOpacity,
  Alert,
} from "react-native";
import { doc, updateDoc, arrayRemove, onSnapshot } from "firebase/firestore";
import { db } from "../FirebaseConfig";
import { getAuth } from "firebase/auth";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";

const GroupEdit = ({ route, navigation }) => {
  const { group } = route.params || {};
  const [groupData, setGroupData] = useState(null);
  const [loading, setLoading] = useState(true);

  const auth = getAuth();
  const currentUser = auth.currentUser;

  useEffect(() => {
    if (!group?.id) return;

    const groupRef = doc(db, "groups", group.id);

    const unsubscribe = onSnapshot(groupRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = { id: snapshot.id, ...snapshot.data() };
        setGroupData(data);

        if (!data.membersUIDs?.includes(currentUser.uid)) {
          navigation.navigate("Home");
        }
      } else {
        setGroupData(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [group]);

  const handleLeaveGroup = async () => {
    Alert.alert("Leave Group", "Are you sure you want to leave?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Leave",
        style: "destructive",
        onPress: async () => {
          try {
            const groupRef = doc(db, "groups", group.id);

            await updateDoc(groupRef, {
              members: arrayRemove({
                uid: currentUser.uid,
                username: currentUser.displayName || "Anonymous",
              }),
              membersUIDs: arrayRemove(currentUser.uid),
            });

            navigation.navigate("Home");
          } catch (error) {
            console.error("Error leaving group:", error);
            Alert.alert("Error", "Could not leave the group.");
          }
        },
      },
    ]);
  };

  const handleKickMember = async (member) => {
    Alert.alert(
      "Kick Member",
      `Remove ${member.username || "this user"}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Kick",
          style: "destructive",
          onPress: async () => {
            try {
              const groupRef = doc(db, "groups", group.id);

              await updateDoc(groupRef, {
                members: arrayRemove({
                  uid: member.uid,
                  username: member.username || "Anonymous",
                }),
                membersUIDs: arrayRemove(member.uid),
              });

              if (groupData.toiletStatus) {
                const updatedToiletStatus = groupData.toiletStatus.filter(
                  (u) => u.uid !== member.uid
                );
                await updateDoc(groupRef, { toiletStatus: updatedToiletStatus });
              }
            } catch (error) {
              console.error("Error kicking member:", error);
              Alert.alert("Error", "Could not remove member.");
            }
          },
        },
      ]
    );
  };

  const renderAvatar = (username) => {
    const initial = username?.[0]?.toUpperCase() || "?";
    return (
      <LinearGradient
        colors={["#6a11cb", "#2575fc"]}
        style={styles.avatar}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <Text style={styles.avatarText}>{initial}</Text>
      </LinearGradient>
    );
  };

  if (loading) {
    return (
      <LinearGradient colors={["#6a11cb", "#2575fc"]} style={styles.background}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#ffffff" />
        </View>
      </LinearGradient>
    );
  }

  if (!groupData) {
    return (
      <LinearGradient colors={["#6a11cb", "#2575fc"]} style={styles.background}>
        <View style={styles.center}>
          <Text style={styles.errorText}>Group not found</Text>
        </View>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient colors={["#6a11cb", "#2575fc"]} style={styles.background}>
      <FlatList
        ListHeaderComponent={
          <View style={styles.container}>
            {/* Group Header */}
            <BlurView intensity={40} tint="dark" style={styles.headerCard}>
              <Ionicons name="people-circle-outline" size={50} color="#fff" />
              <Text style={styles.groupName}>{groupData.name}</Text>
              <Text style={styles.ownerName}>
                👑 {groupData.ownerName || "Unknown"}
              </Text>
            </BlurView>

            {/* Members Card */}
            <BlurView intensity={40} tint="dark" style={styles.membersCard}>
              <Text style={styles.sectionTitle}>👥 Members</Text>

              {groupData.members?.length > 0 ? (
                groupData.members.map((item) => (
                  <View key={item.uid} style={styles.memberRow}>
                    <View style={styles.memberInfo}>
                      {renderAvatar(item.username)}
                      <Text style={styles.memberName}>
                        {item.username || "Anonymous"}
                        {item.uid === groupData.ownerId && " 👑"}
                      </Text>
                    </View>

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
                ))
              ) : (
                <Text style={styles.emptyText}>No members yet</Text>
              )}
            </BlurView>
          </View>
        }
        contentContainerStyle={{ paddingBottom: 100 }}
        data={[]} // FlatList needs data but we only use ListHeader
        renderItem={null}
      />

      {/* Floating Leave Group Button */}
      <TouchableOpacity
        style={styles.fabWrapper}
        onPress={handleLeaveGroup}
        activeOpacity={0.9}
      >
        <LinearGradient
          colors={["#ff416c", "#ff4b2b"]}
          style={styles.fab}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <Ionicons name="exit-outline" size={26} color="#fff" />
        </LinearGradient>
      </TouchableOpacity>
    </LinearGradient>
  );
};

export default GroupEdit;

const styles = StyleSheet.create({
  background: {
    flex: 1,
  },
  container: {
    padding: 20,
    gap: 20,
  },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  errorText: { fontSize: 16, color: "#eee" },
  headerCard: {
    alignItems: "center",
    padding: 28,
    borderRadius: 24,
    overflow: "hidden",
  },
  groupName: { fontSize: 24, fontWeight: "700", color: "#fff", marginTop: 10 },
  ownerName: { fontSize: 15, fontWeight: "500", color: "#ddd", marginTop: 4 },
  membersCard: {
    borderRadius: 20,
    padding: 16,
    gap: 12,
    overflow: "hidden",
  },
  sectionTitle: { fontSize: 18, fontWeight: "700", color: "#fff" },
  memberRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.08)",
    padding: 12,
    borderRadius: 14,
  },
  memberInfo: { flexDirection: "row", alignItems: "center", gap: 12 },
  memberName: { fontSize: 15, fontWeight: "600", color: "#fff" },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 16,
  },
  kickButton: {
    backgroundColor: "#ff4b2b",
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 16,
  },
  kickText: { color: "#fff", fontWeight: "600" },
  emptyText: { textAlign: "center", color: "#ccc", marginTop: 8 },

  // Floating Action Button
  fabWrapper: {
    position: "absolute",
    bottom: 28,
    right: 24,
    borderRadius: 40,
    elevation: 6,
    shadowColor: "#000",
    shadowOpacity: 0.3,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 4 },
  },
  fab: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: "center",
    alignItems: "center",
  },
});