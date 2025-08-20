import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const GroupEdit = ({ route }) => {
  const { group } = route.params || {}; // receive group data

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Hello from GroupEdit Screen!</Text>
      {group && <Text style={styles.groupName}>Group: {group.name}</Text>}
    </View>
  );
};

export default GroupEdit;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff'
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10
  },
  groupName: {
    fontSize: 18,
    color: '#333'
  }
});
