"use client";
import {
  Alert,
  Button,
  FormControl,
  FormLabel,
  Heading,
  HStack,
  Icon,
  Input,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  Stack,
  Table,
  Thead,
  Tbody,
  Th,
  Tr,
  Td,
  Text,
  useDisclosure,
  FormHelperText,
  FormErrorMessage,
  IconButton,
  useToast,
} from "@chakra-ui/react";
import { useRouter } from "next/navigation";
import { TbPlus, TbCopy, TbInfoCircle, TbTrash } from "react-icons/tb";
import { useForm } from "react-hook-form";
import { analytics } from "@/lib/analytics";
import API from "@/lib/api";

function TokenRow({ id, description, token, onDelete }) {
  const toast = useToast();
  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);

    toast({
      description: "Copied to clipboard",
      position: "top",
      colorScheme: "gray",
    });
  };

  return (
    <Tr>
      <Td>{description}</Td>
      <Td>
        <HStack>
          <Text>{token}</Text>
          <IconButton
            size="sm"
            icon={<Icon color="orange.500" fontSize="lg" as={TbCopy} />}
            onClick={() => copyToClipboard(token)}
          />
        </HStack>
      </Td>
      <Td textAlign="right">
        <IconButton
          size="sm"
          variant="ghost"
          icon={<Icon fontSize="lg" as={TbTrash} />}
          onClick={() => onDelete(id)}
        />
      </Td>
    </Tr>
  );
}

export default function ApiTokensClientPage({ data, session }) {
  const { isOpen, onClose, onOpen } = useDisclosure();
  const router = useRouter();
  const api = new API(session);
  const {
    formState: { isSubmitting, errors },
    handleSubmit,
    register,
    reset,
  } = useForm();

  const onSubmit = async (values) => {
    await api.createApiToken(values);

    if (process.env.NEXT_PUBLIC_SEGMENT_WRITE_KEY) {
      analytics.track("Created API Token");
    }

    router.refresh();
    reset();
    onClose();
  };

  const handleDelete = async (id) => {
    await api.deleteApiToken({ id });

    if (process.env.NEXT_PUBLIC_SEGMENT_WRITE_KEY) {
      analytics.track("Deleted API Token");
    }

    router.refresh();
  };

  return (
    <Stack paddingX={12} paddingY={12} spacing={6} flex={1}>
      <HStack justifyContent="space-between">
        <Stack flex={1}>
          <Heading as="h1" fontSize="2xl">
            Api tokens
          </Heading>
          <Text color="gray.400">Your secret API keys are listed below.</Text>
        </Stack>
        <Button
          leftIcon={<Icon as={TbPlus} />}
          alignSelf="flex-start"
          onClick={onOpen}
        >
          New token
        </Button>
      </HStack>
      <Stack spacing={4}>
        <Table variant="simple">
          <Thead>
            <Tr>
              <Th>Description</Th>
              <Th>Key</Th>
              <Th>&nbsp;</Th>
            </Tr>
          </Thead>
          <Tbody>
            {data?.map(({ description, id, token }) => (
              <TokenRow
                key={id}
                id={id}
                description={description}
                token={token}
                onDelete={(id) => handleDelete(id)}
              />
            ))}
          </Tbody>
        </Table>
      </Stack>
      <Modal isOpen={isOpen} onClose={onClose}>
        <ModalOverlay />
        <ModalContent as="form" onSubmit={handleSubmit(onSubmit)}>
          <ModalHeader>New api token</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <Stack spacing={4}>
              <Alert variant="subtle">
                <HStack alignItems="flex-start">
                  <Icon as={TbInfoCircle} marginTop={1} />
                  <Text>Remember to not share your Api token with anyone.</Text>
                </HStack>
              </Alert>
              <Stack>
                <FormControl isRequired isInvalid={errors?.description}>
                  <FormLabel>Description</FormLabel>
                  <Input
                    type="text"
                    {...register("description", { required: true })}
                  />
                  <FormHelperText>
                    A description for future reference
                  </FormHelperText>
                  {errors?.description && (
                    <FormErrorMessage>Invalid description</FormErrorMessage>
                  )}
                </FormControl>
              </Stack>
            </Stack>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" isLoading={isSubmitting}>
              Create
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Stack>
  );
}
