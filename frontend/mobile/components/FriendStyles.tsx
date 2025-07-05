import { StyleSheet } from 'react-native'

export const friendStyle = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'flex-start',
        padding: 10,
        borderWidth: 1,
        borderColor: 'black',
        width: '100%'
    },

    topContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 15,
        paddingVertical: 10
    },

    friendItem: {
        borderWidth: 1,
        borderColor: 'black',
        margin: 10,
        padding: 15,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderRadius: 5
    },
    
    copyButton: {
        backgroundColor: '#007AFF',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 4
    },
    
    copyButtonText: {
        color: 'white',
        fontSize: 12,
        fontWeight: '500'
    },
    
    addButton: {
        backgroundColor: '#28a745',
        paddingHorizontal: 15,
        paddingVertical: 8,
        borderRadius: 6,
        alignSelf: 'center'
    },
    
    addButtonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: '600'
    },
    
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center'
    },
    
    modalContent: {
        backgroundColor: 'white',
        padding: 20,
        borderRadius: 10,
        width: '80%',
        maxWidth: 300
    },
    
    modalTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 15,
        textAlign: 'center'
    },
    
    input: {
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 5,
        padding: 10,
        marginBottom: 15,
        fontSize: 16
    },
    
    modalButtons: {
        flexDirection: 'row',
        justifyContent: 'space-between'
    },
    
    cancelButton: {
        backgroundColor: '#6c757d',
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 5,
        flex: 0.48
    },
    
    cancelButtonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: '500',
        textAlign: 'center'
    },
    
    confirmButton: {
        backgroundColor: '#007AFF',
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 5,
        flex: 0.48
    },
    
    confirmButtonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: '500',
        textAlign: 'center'
    }
})